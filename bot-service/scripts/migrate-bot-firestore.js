import "dotenv/config";
import admin from "firebase-admin";
import path from "node:path";
import { fileURLToPath } from "node:url";

function serviceAccountFromEnv(name) {
  const raw = process.env[name];
  if (!raw || !raw.trim()) throw new Error(`${name} is required.`);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${name} must contain the full service-account JSON (${err.message}).`);
  }
}

export async function migrateBotFirestore(sourceDb, targetDb) {
  const [sourceBots, targetBots, sourceSettings, targetSettings] = await Promise.all([
    sourceDb.collection("botDeployments").get(),
    targetDb.collection("botDeployments").limit(1).get(),
    sourceDb.collection("botServiceSettings").doc("deploy").get(),
    targetDb.collection("botServiceSettings").doc("deploy").get(),
  ]);

  if (!targetBots.empty || targetSettings.exists) {
    throw new Error("The target bot database already contains bot data; refusing to overwrite it.");
  }

  const writer = targetDb.bulkWriter();
  let sessionFileCount = 0;
  try {
    for (const sourceBot of sourceBots.docs) {
      const targetBot = targetDb.collection("botDeployments").doc(sourceBot.id);
      writer.set(targetBot, sourceBot.data());

      const sourceFiles = await sourceBot.ref.collection("sessionFiles").get();
      for (const sourceFile of sourceFiles.docs) {
        writer.set(targetBot.collection("sessionFiles").doc(sourceFile.id), sourceFile.data());
        sessionFileCount++;
      }
    }

    if (sourceSettings.exists) {
      writer.set(targetDb.collection("botServiceSettings").doc("deploy"), sourceSettings.data());
    }
    await writer.close();
  } catch (err) {
    await writer.close().catch(() => {});
    throw err;
  }

  return {
    deploymentsCopied: sourceBots.size,
    sessionFilesCopied: sessionFileCount,
    deployApiKeyCopied: sourceSettings.exists,
  };
}

async function main() {
  const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountFromEnv("SOURCE_FIREBASE_SERVICE_ACCOUNT_KEY")),
  }, "bot-firestore-migration-source");
  const targetApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountFromEnv("BOT_FIREBASE_SERVICE_ACCOUNT_KEY")),
  }, "bot-firestore-migration-target");

  try {
    const result = await migrateBotFirestore(admin.firestore(sourceApp), admin.firestore(targetApp));
    console.log("Bot Firestore copy completed (source records were not deleted):");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await Promise.all([sourceApp.delete(), targetApp.delete()]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`Bot Firestore migration failed: ${err.message}`);
    process.exitCode = 1;
  });
}
