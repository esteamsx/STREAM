import crypto from "node:crypto";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;
const REMINDER_COLLECTION = "premium_expiry_reminders";

function reminderExpiryRange(now = Date.now(), sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
  const end = Number(now) + THREE_DAYS_MS;
  const start = end - Math.max(1, Number(sweepIntervalMs) || DEFAULT_SWEEP_INTERVAL_MS);
  return { start, end };
}

function isReminderEligible(profile, expiryAt, now = Date.now(), sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
  const expiry = Number(expiryAt);
  if (!profile || profile.verified !== true || !Number.isFinite(expiry) || expiry <= Number(now)) return false;
  const reminderWindow = Math.max(1, Number(sweepIntervalMs) || DEFAULT_SWEEP_INTERVAL_MS);
  if (expiry < Number(now) + THREE_DAYS_MS - reminderWindow || expiry > Number(now) + THREE_DAYS_MS) return false;
  if (!String(profile.email || "").trim()) return false;
  const status = String(profile.subscriptionStatus || profile.premiumSubscriptionStatus || "").trim().toLowerCase();
  if (["cancelled", "canceled", "expired", "inactive", "deleted"].includes(status)) return false;
  return true;
}

function formatExpiryDate(expiryAt, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  }).format(new Date(Number(expiryAt)));
}

function reminderId(uid, expiryAt) {
  return crypto.createHash("sha256").update(`${String(uid)}:${Number(expiryAt)}`).digest("hex");
}

function createPremiumExpiryReminderService({
  database,
  sendReminder,
  renewUrl,
  clock = Date.now,
  sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS,
  logger = console,
} = {}) {
  if (!database?.collection || typeof sendReminder !== "function") {
    throw new TypeError("A database and reminder sender are required.");
  }

  async function run() {
    const now = Number(clock());
    const range = reminderExpiryRange(now, sweepIntervalMs);
    const candidates = await database.collection("users")
      .where("verifiedExpiresAt", ">=", range.start)
      .where("verifiedExpiresAt", "<", range.end)
      .get();
    const summary = { checked: candidates.size || 0, sent: 0, skipped: 0, failed: 0 };

    for (const candidate of candidates.docs || []) {
      const uid = candidate.id;
      const userRef = database.collection("users").doc(uid);
      const expiry = Number(candidate.data()?.verifiedExpiresAt);
      const reminderRef = database.collection(REMINDER_COLLECTION).doc(reminderId(uid, expiry));
      let recipient = null;
      const claimed = await database.runTransaction(async (tx) => {
        const [userSnap, reminderSnap] = await Promise.all([tx.get(userRef), tx.get(reminderRef)]);
        if (!userSnap.exists || reminderSnap.exists) return false;
        const profile = userSnap.data();
        const currentExpiry = Number(profile.verifiedExpiresAt);
        if (currentExpiry !== expiry || currentExpiry < range.start || currentExpiry >= range.end || !isReminderEligible(profile, currentExpiry, now, sweepIntervalMs)) return false;
        recipient = String(profile.email).trim();
        tx.set(reminderRef, {
          uid,
          expiryAt: currentExpiry,
          status: "sending",
          claimedAt: now,
        });
        return true;
      });
      if (!claimed) {
        summary.skipped++;
        continue;
      }

      try {
        // Re-read immediately before dispatch so an account renewal or cancellation
        // between candidate scan and SMTP submission suppresses a stale reminder.
        const fresh = await userRef.get();
        const freshProfile = fresh.exists ? fresh.data() : null;
        if (!freshProfile || Number(freshProfile.verifiedExpiresAt) !== expiry || !isReminderEligible(freshProfile, expiry, Number(clock()), sweepIntervalMs)) {
          await reminderRef.set({ status: "skipped", completedAt: Number(clock()) }, { merge: true });
          summary.skipped++;
          continue;
        }
        await sendReminder({
          email: recipient,
          expiryAt: expiry,
          expiryDate: formatExpiryDate(expiry),
          renewUrl: String(typeof renewUrl === "function" ? renewUrl() : renewUrl || ""),
        });
        await reminderRef.set({ status: "sent", sentAt: Number(clock()) }, { merge: true });
        summary.sent++;
      } catch (error) {
        // The claim remains durable after an ambiguous SMTP failure: automatically
        // retrying could send duplicates if the provider accepted the message.
        await reminderRef.set({ status: "failed", completedAt: Number(clock()), errorCode: String(error?.code || "EMAIL_DELIVERY_FAILED").slice(0, 80) }, { merge: true }).catch(() => {});
        logger.error?.("[premium-expiry-reminder] email delivery failed", { code: error?.code || "EMAIL_DELIVERY_FAILED" });
        summary.failed++;
      }
    }
    return summary;
  }

  return { run };
}

export { THREE_DAYS_MS, DEFAULT_SWEEP_INTERVAL_MS, REMINDER_COLLECTION, reminderExpiryRange, isReminderEligible, formatExpiryDate, reminderId, createPremiumExpiryReminderService };
