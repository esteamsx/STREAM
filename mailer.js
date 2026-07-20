import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || `ES TEAMS TV <onboarding@resend.dev>`;

// Sends via Gmail SMTP first; if that fails (e.g. Render blocking SMTP ports),
// falls back to the Resend API so the email still goes out.
async function sendMailWithFallback(mailOptions) {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (smtpErr) {
    console.error("[mailer] SMTP send failed, falling back to Resend:", smtpErr.message);

    if (!RESEND_API_KEY) {
      console.error("[mailer] RESEND_API_KEY not set, cannot fall back.");
      throw smtpErr;
    }

    const payload = {
      from: RESEND_FROM,
      to: [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
    };
    if (mailOptions.replyTo) payload.reply_to = mailOptions.replyTo;
    if (mailOptions.attachments?.length) {
      payload.attachments = mailOptions.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content)
          ? a.content.toString("base64")
          : Buffer.from(a.content).toString("base64"),
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend fallback failed: ${res.status} ${errText}`);
    }

    return res.json();
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
    ? "If you didn't request a password reset, your password will remain unchanged — you can safely ignore this email."
    : "If you didn't request this, ignore this email.";
  await sendMailWithFallback({
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
    subject: `DMCA Takedown Request — ${copyrightOwner || reporterName}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A0A0F;padding:32px;color:#F3F3FA">
        <h2 style="color:#00E0FF;margin:0 0 12px">ES TEAMS TV — DMCA Takedown Request</h2>
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

export { sendVerificationCode, sendBanNotificationEmail, sendDmcaReportEmail };
