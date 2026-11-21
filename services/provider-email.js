const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

function getVerifiedGoogleEmail(decodedToken) {
  const email = normalizeEmail(decodedToken?.email);
  return email && decodedToken?.email_verified === true ? email : null;
}

function getVerifiedGithubEmail(emailEntries) {
  if (!Array.isArray(emailEntries)) return null;
  const verified = emailEntries
    .filter((entry) => entry && entry.verified === true)
    .map((entry) => ({ email: normalizeEmail(entry.email), primary: entry.primary === true }))
    .filter((entry) => entry.email);
  return verified.find((entry) => entry.primary)?.email || verified[0]?.email || null;
}

function isEmailOwnerAvailable(existingUid, currentUid) {
  return !existingUid || existingUid === currentUid;
}

async function assertEmailAvailableForUid(getUserByEmail, email, currentUid) {
  let existing;
  try {
    existing = await getUserByEmail(email);
  } catch (error) {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  }
  if (!isEmailOwnerAvailable(existing?.uid, currentUid)) {
    throw Object.assign(new Error("That email is already in use by another account."), {
      status: 409,
      code: "email-already-in-use",
    });
  }
  return existing || null;
}

export { normalizeEmail, getVerifiedGoogleEmail, getVerifiedGithubEmail, isEmailOwnerAvailable, assertEmailAvailableForUid };
