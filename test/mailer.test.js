import test from "node:test";
import assert from "node:assert/strict";

const saved = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test.afterEach(restoreEnv);

test("mailer defaults to Heroku-safe Gmail SMTP on port 465 with TLS 1.2", async () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  const { getEmailTransportConfig } = await import(`../services/mailer.js?config-default-${Date.now()}`);
  assert.deepEqual(getEmailTransportConfig(), {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    minTls: "TLSv1.2",
  });
});

test("mailer never selects blocked SMTP port 25 and supports explicit STARTTLS port 587", async () => {
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PORT = "25";
  delete process.env.SMTP_SECURE;
  const blocked = await import(`../services/mailer.js?config-blocked-${Date.now()}`);
  assert.equal(blocked.getEmailTransportConfig().port, 465);
  assert.equal(blocked.getEmailTransportConfig().secure, true);

  process.env.SMTP_PORT = "587";
  process.env.SMTP_SECURE = "false";
  const starttls = await import(`../services/mailer.js?config-starttls-${Date.now()}`);
  assert.deepEqual(starttls.getEmailTransportConfig(), {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    minTls: "TLSv1.2",
  });
});

test("missing Gmail credentials fail safely before attempting SMTP", async () => {
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  const { sendVerificationCode } = await import(`../services/mailer.js?missing-credentials-${Date.now()}`);
  await assert.rejects(
    sendVerificationCode("user@example.com", "123456", "signup"),
    (error) => error.code === "EMAIL_NOT_CONFIGURED" &&
      error.userFacing === "Email verification is temporarily unavailable. Please try again later." &&
      !String(error.message).includes("GMAIL_APP_PASSWORD"),
  );
});
