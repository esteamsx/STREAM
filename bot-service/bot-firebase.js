import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!raw || !raw.trim()) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service account JSON " +
      "as an environment variable before starting the bot service."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch (err) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY is set but is not valid JSON. Paste the whole service " +
      `account file, including the surrounding braces. (${err.message})`
  );
}

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
export default db;
