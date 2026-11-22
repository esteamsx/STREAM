const DEFAULT_SESSION_BACKUP_INTERVAL_MS = 15 * 60 * 1000;
const MIN_SESSION_BACKUP_INTERVAL_MS = 60 * 1000;
const MAX_SESSION_BACKUP_INTERVAL_MS = 60 * 60 * 1000;

export function parseSessionBackupIntervalMs(raw) {
  if (raw == null || String(raw).trim() === "") return DEFAULT_SESSION_BACKUP_INTERVAL_MS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < MIN_SESSION_BACKUP_INTERVAL_MS || value > MAX_SESSION_BACKUP_INTERVAL_MS) {
    return DEFAULT_SESSION_BACKUP_INTERVAL_MS;
  }
  return value;
}
