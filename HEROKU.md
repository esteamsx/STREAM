# Heroku deployment

This repository is configured as a Heroku Node.js web app.

## Deploy from GitHub

1. Create a Heroku app and connect the `esteamsx/STREAM` GitHub repository.
2. Set the deploy branch to `main`.
3. In **Settings → Config Vars**, add `FIREBASE_SERVICE_ACCOUNT_KEY` with the complete Firebase Admin service-account JSON, including the surrounding braces.
4. Set `SITE_URL` to the app's public HTTPS URL, such as `https://your-app.herokuapp.com`.
5. Set `ALLOWED_HOSTS` to the Heroku hostname. If a custom domain is used, include that hostname too, separated by commas.
6. Add the other service credentials used by the features you enable, such as `TMDB_API_KEY` and `PAYSTACK_SECRET_KEY`.
7. Deploy the `main` branch.

Heroku uses the root `Procfile` to start the web dyno with `npm start`. The server already binds to Heroku's `PORT` environment variable, and `/health` is available for a health check.

## Email verification

Email verification uses the existing Nodemailer workflow with Gmail SMTP on `smtp.gmail.com:465`, implicit TLS, and a minimum TLS version of 1.2. It does not use SMTP port 25. Set these Config Vars:

```text
GMAIL_USER=your-sending-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-Google-App-Password
```

The app password is not the normal Google account password. If an SMTP provider other than Gmail is configured, `SMTP_HOST` may be set and `SMTP_PORT` may be only `465` or `587`; port `25` is never selected. `SMTP_SECURE` defaults to `true` on port 465 and `false` on port 587. Do not expose any of these values to frontend code or commit them to Git.

## Deploy with the Heroku CLI

```sh
heroku login
heroku create
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
heroku config:set SITE_URL='https://your-app.herokuapp.com'
heroku config:set ALLOWED_HOSTS='your-app.herokuapp.com'
git push heroku main
heroku logs --tail
```

Do not commit Firebase credentials or any other secret to the repository. Configure secrets through Heroku Config Vars. The Heroku `PORT` value is assigned by the platform and must not be hard-coded.
