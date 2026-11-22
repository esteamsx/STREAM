# Bot service deployment configuration

The bot service continues to use the same Firebase project as the main site. Keep its existing `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable configured with the service-account JSON for the original project; do not use `BOT_FIREBASE_SERVICE_ACCOUNT_KEY`. Bot deployments, saved WhatsApp session files, and the deploy API-key setting remain in the existing Firestore project.

Keep the existing `INTERNAL_API_KEY` configured on both the main site and bot service with matching values. The deploy API key remains stored server-side in Firestore and is not exposed to browsers.

Session-file backups now default to every 15 minutes instead of every 5 minutes. Optionally set `BOT_SESSION_BACKUP_INTERVAL_MS` from `60000` (1 minute) to `3600000` (1 hour); `900000` is 15 minutes. Invalid or out-of-range values use the 15-minute default. The longer interval lowers repeated checks/writes but can leave up to about 15 minutes of recent session changes unpersisted after an abrupt host failure.

Do not remove or delete the second Firebase project in the Cloud Console as part of this code rollback if it contains data you might need. This version simply stops using it.
