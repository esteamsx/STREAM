import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000,
});

async function sendMailWithFallback(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    return { provider: "gmail" };
  } catch (smtpErr) {
    console.error("[mailer] Gmail SMTP send failed:", smtpErr.message);
    throw smtpErr;
  }
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
      ? `${code} is your ES TEAMS TV account deletion code`
      : isReset
      ? `${code} is your ES TEAMS TV password reset code`
      : `${code} is your ES TEAMS TV verification code`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV</h2>
        <p style="margin:0 0 4px;font-weight:700;letter-spacing:1px;color:${isDeletion ? "#FF3B5C" : "rgba(255,255,255,.6)"};font-size:12px">${heading}</p>
        <p style="margin:0 0 20px">${intro}</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#15151F;padding:16px 24px;border-radius:8px;display:inline-block">${code}</div>
        <p style="margin:20px 0 0;color:rgba(255,255,255,.5);font-size:13px">This code expires in 5 minutes. ${footer}</p>
      </div>
    `,
  });
}

const SIGNUP_GMAIL_USER = process.env.SIGNUP_GMAIL_USER || process.env.GMAIL_USER;

async function sendSignupVerificationCode(email, code) {
  return sendMailWithFallback({
    from: `"ES TEAMS TV" <${SIGNUP_GMAIL_USER}>`,
    to: email,
    subject: `${code} is your ES TEAMS TV verification code`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV</h2>
        <p style="margin:0 0 4px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.6);font-size:12px">VERIFICATION CODE</p>
        <p style="margin:0 0 20px">Your verification code is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#15151F;padding:16px 24px;border-radius:8px;display:inline-block">${code}</div>
        <p style="margin:20px 0 0;color:rgba(255,255,255,.5);font-size:13px">This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
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
        <p style="margin:0 0 4px">Hello, ${escapeHtml(name)},</p>
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

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export { sendVerificationCode, sendSignupVerificationCode, sendBanNotificationEmail, sendDmcaReportEmail };
