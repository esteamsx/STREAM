# Heroku deployment

This repository is configured as a Heroku Node.js web app.

## Deploy from GitHub

1. Create a Heroku app and connect the `esteamsx/STREAM` GitHub repository.
2. Set the deploy branch to `main`.
3. In **Settings → Config Vars**, add `FIREBASE_SERVICE_ACCOUNT_KEY` with the complete Firebase Admin service-account JSON, including the surrounding braces.
4. Set `SITE_URL` to the app's public HTTPS URL, such as `https://your-app.herokuapp.com`.
5. Set `ALLOWED_HOSTS` to the Heroku hostname. If a custom domain is used, include that hostname too, separated by commas.
6. Add the other service credentials used by the features you enable, such as `TMDB_API_KEY`, `PAYSTACK_SECRET_KEY`, `GMAIL_USER`, and `GMAIL_APP_PASSWORD`.
7. Deploy the `main` branch.

Heroku uses the root `Procfile` to start the web dyno with `npm start`. The server already binds to Heroku's `PORT` environment variable, and `/health` is available for a health check.

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
