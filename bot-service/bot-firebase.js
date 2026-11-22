import admin from "firebase-admin";

const raw = process.env.BOT_FIREBASE_SERVICE_ACCOUNT_KEY;

if (!raw || !raw.trim()) {
  throw new Error(
    "BOT_FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the bot Firebase project's service account JSON " +
      "as an environment variable before starting the bot service."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch (err) {
  throw new Error(
    "BOT_FIREBASE_SERVICE_ACCOUNT_KEY is set but is not valid JSON. Paste the whole service " +
      `account file, including the surrounding braces. (${err.message})`
  );
}

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}, "es-teams-bot-database");

const db = admin.firestore(app);

export { db };
export default db;
