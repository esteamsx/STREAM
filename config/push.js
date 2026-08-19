import webpush from "web-push";
import { db } from "./firebase.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:etimpaschal95@gmail.com";

const PUSH_ENABLED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function saveSubscription(uid, subscription) {
  const endpoint = subscription && subscription.endpoint;
  if (!endpoint) throw new Error("Invalid subscription.");
  const id = Buffer.from(endpoint).toString("base64url").slice(0, 180);
  await db.collection("pushSubscriptions").doc(id).set(
    {
      uid: uid || null,
      endpoint,
      keys: subscription.keys || {},
      createdAt: Date.now(),
      ua: subscription.ua || null,
    },
    { merge: true }
  );
  return { id };
}

async function removeSubscription(endpoint) {
  if (!endpoint) return;
  const id = Buffer.from(endpoint).toString("base64url").slice(0, 180);
  await db.collection("pushSubscriptions").doc(id).delete().catch(() => {});
}

async function removeSubscriptionsForUid(uid) {
  const snap = await db.collection("pushSubscriptions").where("uid", "==", uid).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit().catch(() => {});
}

async function getSubscriptionCount() {
  const snap = await db.collection("pushSubscriptions").count().get();
  return snap.data().count || 0;
}

async function sendToSubscriptionDoc(doc, payload) {
  const data = doc.data();
  const subscription = { endpoint: data.endpoint, keys: data.keys };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err && (err.statusCode === 404 || err.statusCode === 410)) {
      await doc.ref.delete().catch(() => {});
    }
    return false;
  }
}

async function sendPushToUid(uid, payload) {
  if (!PUSH_ENABLED) return { sent: 0, failed: 0 };
  const snap = await db.collection("pushSubscriptions").where("uid", "==", uid).get();
  let sent = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const ok = await sendToSubscriptionDoc(doc, payload);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

async function broadcastPush(payload) {
  if (!PUSH_ENABLED) return { sent: 0, failed: 0, total: 0 };
  const snap = await db.collection("pushSubscriptions").get();
  let sent = 0;
  let failed = 0;
  const batchSize = 50;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const results = await Promise.all(chunk.map((doc) => sendToSubscriptionDoc(doc, payload)));
    results.forEach((ok) => (ok ? sent++ : failed++));
  }
  return { sent, failed, total: docs.length };
}

export {
  PUSH_ENABLED,
  VAPID_PUBLIC_KEY,
  saveSubscription,
  removeSubscription,
  removeSubscriptionsForUid,
  getSubscriptionCount,
  sendPushToUid,
  broadcastPush,
};
