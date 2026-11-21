const DEFAULT_RECENT_AUTH_MAX_AGE_MS = 10 * 60 * 1000;
const ALLOWED_AUTH_CLOCK_SKEW_MS = 30 * 1000;

function normalizeFirebaseAuthTime(value, now = Date.now()) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const milliseconds = seconds * 1000;
  if (!Number.isFinite(milliseconds) || milliseconds > Number(now) + ALLOWED_AUTH_CLOCK_SKEW_MS) return null;
  return milliseconds;
}

function isRecentAuthentication(sessionPayload, now = Date.now(), maxAgeMs = DEFAULT_RECENT_AUTH_MAX_AGE_MS) {
  const authenticatedAt = Number(sessionPayload?.authTimeMs);
  const currentTime = Number(now);
  const maxAge = Math.max(0, Number(maxAgeMs) || DEFAULT_RECENT_AUTH_MAX_AGE_MS);
  return Number.isFinite(authenticatedAt)
    && authenticatedAt > 0
    && authenticatedAt <= currentTime + ALLOWED_AUTH_CLOCK_SKEW_MS
    && currentTime - authenticatedAt <= maxAge;
}

export {
  DEFAULT_RECENT_AUTH_MAX_AGE_MS,
  ALLOWED_AUTH_CLOCK_SKEW_MS,
  normalizeFirebaseAuthTime,
  isRecentAuthentication,
};
