# Bot Firebase project split

This moves only bot deployment data out of the site's Firebase project. The main site continues using its existing `FIREBASE_SERVICE_ACCOUNT_KEY`; the bot service uses `BOT_FIREBASE_SERVICE_ACCOUNT_KEY` for the new bot-only project. Site users and Firebase Authentication stay in the main project. The bot service stores deployment records, WhatsApp session files, and its private deploy API key in the separate Firestore.

## 1. Create the bot-only Firebase project

1. In Firebase Console, create a separate project, for example `es-teams-bot-data`. Do not move the site's Firebase Authentication or user collections.
2. Create its Firestore database in **Native mode** and select the region deliberately; the database location cannot be changed later.
3. In Google Cloud IAM for this new project, create a dedicated service account for the bot service with the least privilege needed to read and write Firestore (Cloud Datastore User). Do not reuse the main site's service account.
4. Create a JSON key for that service account and store it only in a password manager or the bot host's secret-variable store. Never commit it, put it in the browser, or send it in chat.

## 2. Copy existing bot data before switching projects

Take a backup of the current Firestore project first. The copy script transfers the `botDeployments` documents, each deployment's `sessionFiles` subcollection, and `botServiceSettings/deploy`. It copies; it does **not** delete the source data. It refuses to run if the target already has bot records or the deploy-key setting.

Run from a trusted machine with the repository checked out and dependencies installed. Save both downloaded JSON files outside the repository with owner-only permissions (`chmod 600` on macOS/Linux), and load their contents into temporary environment variables without typing the private JSON into shell history:

```sh
cd bot-service
npm install
export SOURCE_FIREBASE_SERVICE_ACCOUNT_KEY="$(cat /secure/path/main-project-service-account.json)"
export BOT_FIREBASE_SERVICE_ACCOUNT_KEY="$(cat /secure/path/bot-project-service-account.json)"
node scripts/migrate-bot-firestore.js
unset SOURCE_FIREBASE_SERVICE_ACCOUNT_KEY BOT_FIREBASE_SERVICE_ACCOUNT_KEY
```

In PowerShell, use `$env:SOURCE_FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content -Raw 'C:\secure\main-project-service-account.json'` and `$env:BOT_FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content -Raw 'C:\secure\bot-project-service-account.json'`, run `node scripts/migrate-bot-firestore.js`, then remove them with `Remove-Item Env:SOURCE_FIREBASE_SERVICE_ACCOUNT_KEY, Env:BOT_FIREBASE_SERVICE_ACCOUNT_KEY`.

Check the reported deployment/session-file counts and inspect the new project's `botDeployments` and `botServiceSettings/deploy` before cutover. The script does not move Firebase Auth users; existing `uid` values remain identifiers owned by the main site's Auth project.

## 3. Configure the bot service host

In the bot service's environment settings (Railway, if that is still its host), set:

| Variable | Value |
| --- | --- |
| `BOT_FIREBASE_SERVICE_ACCOUNT_KEY` | Full JSON contents of the **new bot-project** service-account key; store as a secret. |
| `INTERNAL_API_KEY` | The existing shared internal API secret. It must exactly match the main site's `INTERNAL_API_KEY`. |
| `BOT_SESSION_BACKUP_INTERVAL_MS` | Optional; `900000` means 15 minutes. The code defaults to 15 minutes and accepts 60000–3600000 ms. |
| `GITHUB_TOKEN` | Keep the existing value if configured; it is optional and used for template downloads/update checks. |
| `PORT` | Leave to the host-provided value. |

Remove the bot service's old `FIREBASE_SERVICE_ACCOUNT_KEY` after adding the bot-specific variable. The service intentionally fails at startup if `BOT_FIREBASE_SERVICE_ACCOUNT_KEY` is missing or invalid; this prevents accidentally continuing to use the main project's credential. Keep the site's `FIREBASE_SERVICE_ACCOUNT_KEY` unchanged in the main site host.

## 4. Deploy in cutover order

1. Confirm the copy completed and that the new bot project contains the deployment records and saved session files.
2. Deploy the latest repository version to the bot service with `BOT_FIREBASE_SERVICE_ACCOUNT_KEY` set. Confirm `/internal/health` is healthy and check the service logs for Firebase initialization errors.
3. Deploy the same repository version to the main site. Keep its `BOT_SERVICE_URL`, `INTERNAL_API_KEY`, and main-project `FIREBASE_SERVICE_ACCOUNT_KEY` unchanged. During this short cutover, avoid changing the deploy API key in the old site admin page; the existing key was copied into the new Firestore, and the new site's admin endpoint will save changes through the protected bot-service API.
4. In the new site admin page, check that the developer API key is configured. If it is not, save the key again there; it remains server-side and is written to the bot project's Firestore.
5. Verify `/deploy-bot` can list the existing bot, display its current status, and that a safe bot action works. Verify channel-react selection still finds a connected admin-owned bot.
6. Keep the old bot records as a rollback copy until the new deployment has been stable. Do not delete the old collection until you have independently verified the new service and retained a backup.

The site continues to authenticate users against its own Firebase project. Only server-to-server calls authenticated by `INTERNAL_API_KEY` cross from the site to the bot service; the bot Firebase credential is never sent to the browser.

## Session-backup tradeoff

The bot now checks for changed session files every 15 minutes by default, down from every 5 minutes. Unchanged files were already skipped, so this mainly reduces repeated filesystem scans and can reduce Firestore writes when WhatsApp modifies session files frequently. A sudden host crash can now lose up to about 15 minutes of session-file changes; graceful bot shutdown still performs a final backup. Set `BOT_SESSION_BACKUP_INTERVAL_MS` between 60000 (1 minute) and 3600000 (1 hour) if you prefer a different durability/quota tradeoff.
