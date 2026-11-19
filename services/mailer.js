import nodemailer from "nodemailer";
import { siteOrigin } from "../config/site.js";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const requestedPort = Number.parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_PORT = requestedPort === 587 ? 587 : 465;
const SMTP_SECURE = SMTP_PORT === 465
  ? true
  : String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_MIN_TLS = "TLSv1.2";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: { minVersion: SMTP_MIN_TLS },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000,
});

function emailConfigurationError() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    const err = new Error("Email delivery is not configured.");
    err.userFacing = "Email verification is temporarily unavailable. Please try again later.";
    err.code = "EMAIL_NOT_CONFIGURED";
    return err;
  }
  return null;
}

function emailDeliveryError(smtpErr) {
  const err = new Error("Email delivery failed.");
  err.userFacing = "Could not send code. Please try again later.";
  err.code = smtpErr?.code || smtpErr?.responseCode || "EMAIL_DELIVERY_FAILED";
  return err;
}

async function sendMailWithFallback(mailOptions) {
  const configError = emailConfigurationError();
  if (configError) throw configError;
  try {
    await transporter.sendMail(mailOptions);
    return { provider: SMTP_HOST === "smtp.gmail.com" ? "gmail" : "smtp" };
  } catch (smtpErr) {
    console.error("[mailer] SMTP send failed", {
      code: smtpErr?.code || null,
      responseCode: smtpErr?.responseCode || null,
    });
    throw emailDeliveryError(smtpErr);
  }
}

function verificationEmailHtml({ heading, intro, code, expiryText, footer }) {
  const origin = escapeHtml(siteOrigin());
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#090b12;color:#f3f4fa;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090b12;padding:26px 12px"><tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111521;border:1px solid #32394b;border-radius:20px;overflow:hidden">
          <tr><td style="height:4px;background:#00e0ff"></td></tr>
          <tr><td style="padding:28px 28px 10px">
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle;padding-right:11px"><img src="${origin}/favicon.svg" width="42" height="42" alt="ES Teams TV" style="display:block;border:0;border-radius:10px"></td><td style="vertical-align:middle;color:#f3f4fa;font-size:18px;font-weight:700;letter-spacing:.4px">ES TEAMS TV</td></tr></table>
            <p style="margin:26px 0 8px;color:#00e0ff;font-size:11px;font-weight:700;letter-spacing:1.7px">${escapeHtml(heading)}</p>
            <h1 style="margin:0 0 12px;color:#f3f4fa;font-size:24px;line-height:1.25">Your secure code</h1>
            <p style="margin:0;color:#c1c6d4;font-size:15px;line-height:1.65">${escapeHtml(intro)}</p>
            <div style="margin:24px 0;padding:17px 14px;text-align:center;background:#090c14;border:1px solid #374157;border-radius:14px;color:#fff;font-family:Consolas,Monaco,monospace;font-size:32px;font-weight:700;letter-spacing:9px">${escapeHtml(code)}</div>
            <p style="margin:0;color:#b8bfd0;font-size:13px;line-height:1.6">${escapeHtml(expiryText)}</p>
            <p style="margin:12px 0 0;color:#8f98ad;font-size:13px;line-height:1.6">${escapeHtml(footer)}</p>
          </td></tr>
          <tr><td style="padding:18px 28px 24px;border-top:1px solid #262d3c;color:#7f899e;font-size:12px;line-height:1.6">ES TEAMS TV · Secure account services</td></tr>
        </table>
      </td></tr></table>
    </body></html>`;
}

async function sendVerificationCode(email, code, purpose) {
  const isReset = purpose === "forgot_password";
  const isDeletion = purpose === "delete_account";
  const heading = isDeletion ? "CONFIRM ACCOUNT DELETION" : isReset ? "RESET PASSWORD" : "VERIFICATION CODE";
  const intro = isDeletion ? "Use this code to confirm you want to delete your account:" : isReset ? "Use this code to reset your password:" : "Your verification code is:";
  const footer = isDeletion
    ? "If you didn't request this, ignore this email and your account will remain active. If you did, your account will be deactivated immediately and permanently removed after 24 hours."
    : isReset
    ? "If you didn't request a password reset, your password will remain unchanged. You can safely ignore this email."
    : "If you didn't request this, ignore this email.";
  return sendMailWithFallback({
    from: `"ES TEAMS TV" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isDeletion
      ? "Your ES TEAMS TV account deletion code"
      : isReset
      ? "Your ES TEAMS TV password reset code"
      : "Your ES TEAMS TV verification code",
    text: `${intro}\n\n${code}\n\nThis code expires in 5 minutes. ${footer}\n\nES TEAMS TV`,
    html: verificationEmailHtml({ heading, intro, code, expiryText: "This code expires in 5 minutes.", footer }),
  });
}

const SIGNUP_GMAIL_USER = process.env.SIGNUP_GMAIL_USER || process.env.GMAIL_USER;

async function sendSignupVerificationCode(email, code) {
  return sendMailWithFallback({
    from: `"ES TEAMS TV" <${SIGNUP_GMAIL_USER}>`,
    to: email,
    subject: "Your ES TEAMS TV verification code",
    text: `Your verification code is ${code}. It expires in 5 minutes. If you didn't request this, ignore this email.\n\nES TEAMS TV`,
    html: verificationEmailHtml({ heading: "EMAIL VERIFICATION", intro: "Use this one-time code to verify your ES TEAMS TV account email address:", code, expiryText: "This code expires in 5 minutes.", footer: "If you didn't request this, ignore this email." }),
  });
}

async function sendPremiumExpiryReminderEmail(email, expiryDate, renewalUrl) {
  if (email && typeof email === "object") {
    const reminder = email;
    email = reminder.email;
    expiryDate = reminder.expiryDate;
    renewalUrl = reminder.renewUrl;
  }
  const safeDate = escapeHtml(expiryDate);
  const safeUrl = escapeHtml(renewalUrl);
  const origin = escapeHtml(siteOrigin());
  const text = `Your ES TEAMS TV Premium membership expires in 3 days, on ${expiryDate}. Renew to keep your Premium benefits. Renew Premium: ${renewalUrl}\n\nThank you for being part of ES TEAMS TV.`;
  return sendMailWithFallback({
    from: `"ES TEAMS TV" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your ES TEAMS TV Premium membership expires in 3 days",
    text,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#090b12;color:#f3f4fa;font-family:Arial,Helvetica,sans-serif">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090b12;padding:26px 12px"><tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#111521;border:1px solid #32394b;border-radius:20px;overflow:hidden">
            <tr><td style="height:4px;background:#00e0ff"></td></tr>
            <tr><td style="padding:28px 28px 26px">
              <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle;padding-right:11px"><img src="${origin}/favicon.svg" width="42" height="42" alt="ES Teams TV" style="display:block;border:0;border-radius:10px"></td><td style="vertical-align:middle;color:#f3f4fa;font-size:18px;font-weight:700;letter-spacing:.4px">ES TEAMS TV</td></tr></table>
              <p style="margin:28px 0 8px;color:#00e0ff;font-size:11px;font-weight:700;letter-spacing:1.7px">PREMIUM MEMBERSHIP</p>
              <h1 style="margin:0 0 12px;color:#f3f4fa;font-size:26px;line-height:1.25">Your Premium expires in 3 days</h1>
              <p style="margin:0;color:#c1c6d4;font-size:15px;line-height:1.65">Your membership is set to expire on <strong style="color:#fff">${safeDate}</strong>. Renewing helps you keep enjoying your Premium benefits without interruption.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:25px 0 20px"><tr><td align="center" style="border-radius:11px;background:#00d9f2"><a href="${safeUrl}" style="display:inline-block;padding:14px 24px;color:#06141a;font-size:13px;font-weight:800;letter-spacing:1px;text-decoration:none;border-radius:11px">RENEW PREMIUM</a></td></tr></table>
              <p style="margin:0;color:#8f98ad;font-size:13px;line-height:1.6">If you have already renewed, thank you—your membership will continue as usual.</p>
            </td></tr>
            <tr><td style="padding:18px 28px 24px;border-top:1px solid #262d3c;color:#7f899e;font-size:12px;line-height:1.6">Thanks for being with us,<br><strong style="color:#c1c6d4">The ES TEAMS TV team</strong></td></tr>
          </table>
        </td></tr></table>
      </body></html>`,
  });
}

async function sendBanNotificationEmail(email, name, appealMailto, logText) {
  await sendMailWithFallback({
    from: `"ES TEAMS TV" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your ES TEAMS TV account has been banned",
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV</h2>
        <p style="margin:0 0 4px;font-weight:700;letter-spacing:1px;color:#FF3B5C;font-size:12px">ACCOUNT BANNED</p>
        <p style="margin:0 0 4px">Hello, ${name},</p>
        <p style="margin:0 0 22px">Your account has been banned by Admin.</p>
        <a href="${appealMailto}" style="display:inline-block;background:linear-gradient(135deg,#00E0FF,#7c5cff);color:#04141a;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:14px">Appeal</a>
        <p style="margin:24px 0 0;color:rgba(255,255,255,.5);font-size:13px">If you believe this was a mistake, tap Appeal above to send us a message about your case.</p>
      </div>
    `,
    attachments: logText ? [{ filename: "logs.txt", content: logText }] : undefined,
  });
}

async function sendDmcaReportEmail(report) {
  const {
    reporterName,
    reporterEmail,
    copyrightOwner,
    workDescription,
    infringingUrls,
    goodFaithStatement,
    accuracyStatement,
    signature,
  } = report;

  await sendMailWithFallback({
    from: `"ES TEAMS TV" <${process.env.GMAIL_USER}>`,
    to: process.env.DMCA_AGENT_EMAIL || process.env.GMAIL_USER,
    replyTo: reporterEmail,
    subject: `DMCA Takedown Request: ${copyrightOwner || reporterName}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV: DMCA Takedown Request</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5);width:180px">Reporter name</td><td>${escapeHtml(reporterName)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Reporter email</td><td>${escapeHtml(reporterEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Copyright owner</td><td>${escapeHtml(copyrightOwner)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Work description</td><td>${escapeHtml(workDescription)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5);vertical-align:top">Infringing URL(s)</td><td>${escapeHtml(infringingUrls).replace(/\n/g, "<br>")}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Signature</td><td>${escapeHtml(signature)}</td></tr>
        </table>
        <p style="margin:20px 0 4px;color:rgba(255,255,255,.5);font-size:13px">Good-faith statement:</p>
        <p style="margin:0 0 12px;font-size:13px">${escapeHtml(goodFaithStatement)}</p>
        <p style="margin:0 0 4px;color:rgba(255,255,255,.5);font-size:13px">Accuracy / perjury statement:</p>
        <p style="margin:0;font-size:13px">${escapeHtml(accuracyStatement)}</p>
      </div>
    `,
  });
}

async function sendWithdrawalRequestEmail(adminEmail, username, amountNgn, bankDetails) {
  await sendMailWithFallback({
    from: `"ES TEAMS TV" <${process.env.GMAIL_USER}>`,
    to: adminEmail,
    subject: `New withdrawal request: ₦${amountNgn.toLocaleString("en-NG")} from @${username}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV</h2>
        <p style="margin:0 0 4px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.6);font-size:12px">WITHDRAWAL REQUEST</p>
        <p style="margin:0 0 20px">@${escapeHtml(username)} requested a withdrawal of <b>₦${amountNgn.toLocaleString("en-NG")}</b>.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5);width:140px">Bank</td><td>${escapeHtml(bankDetails.bankName)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Account Number</td><td>${escapeHtml(bankDetails.accountNumber)}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,.5)">Account Name</td><td>${escapeHtml(bankDetails.accountName)}</td></tr>
        </table>
        <a href="https://esteamstv.devs.surf/admin" style="display:inline-block;background:linear-gradient(135deg,#00E0FF,#7c5cff);color:#04141a;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:14px">Go to Admin Panel</a>
        <p style="margin:24px 0 0;color:rgba(255,255,255,.5);font-size:13px">Pay this manually to the bank details above, then confirm it in the admin panel to notify the user and mark it paid.</p>
      </div>
    `,
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getEmailTransportConfig() {
  return { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, minTls: SMTP_MIN_TLS };
}

export { sendVerificationCode, sendSignupVerificationCode, sendPremiumExpiryReminderEmail, sendBanNotificationEmail, sendDmcaReportEmail, sendWithdrawalRequestEmail, getEmailTransportConfig };
