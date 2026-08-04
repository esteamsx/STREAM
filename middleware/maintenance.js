import { verifySession, getUserProfile, isAdminEmail, getMaintenanceMode } from "../services/auth.js";

const ALLOWED_PATHS = new Set([
  "/login",
  "/api/session",
  "/api/2fa/login-verify",
  "/api/resolve-login-identifier",
  "/api/passkey/authentication-options",
  "/api/passkey/authentication-verify",
  "/api/telegram-auth/callback",
  "/api/github-auth/callback",
  "/api/logout",
  "/api/admin/maintenance",
  "/health",
]);

function maintenanceHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
<style>
  *{box-sizing:border-box}
  body{
    background:#0A0A0F;color:#F3F3FA;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;padding:24px;text-align:center;
    background-image:
      radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.08),transparent 60%),
      radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.06),transparent 55%);
  }
  .box{max-width:380px;display:flex;flex-direction:column;align-items:center}
  .ring{
    width:56px;height:56px;border-radius:50%;
    border:3px solid rgba(255,255,255,.12);border-top-color:#00E0FF;
    animation:spin 0.9s linear infinite;margin-bottom:24px;
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:0 0 10px;font-weight:700}
  p{color:rgba(255,255,255,.55);font-size:.85rem;line-height:1.6;margin:0}
  .brand{
    margin-top:28px;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:.85rem;
    background:linear-gradient(90deg,#00E0FF,#7c5cff);-webkit-background-clip:text;background-clip:text;color:transparent;
  }
</style>
</head>
<body>
  <div class="box">
    <div class="ring"></div>
    <h1>Maintenance in progress</h1>
    <p>We're making some improvements to ES TEAMS TV. Please try again later.</p>
    <div class="brand">ES TEAMS TV</div>
  </div>
</body>
</html>`;
}

export async function maintenanceGate(req, res, next) {
  let on;
  try {
    on = await getMaintenanceMode();
  } catch {
    return next();
  }
  if (!on) return next();
  if (ALLOWED_PATHS.has(req.path)) return next();

  try {
    const sessionId = req.cookies?.session;
    const uid = sessionId ? await verifySession(sessionId) : null;
    if (uid) {
      const profile = await getUserProfile(uid);
      if (profile && isAdminEmail(profile.email)) return next();
    }
  } catch {
  }

  res.set("Cache-Control", "no-store");
  res.set("Retry-After", "3600");
  if (req.path.startsWith("/api/") || req.path.startsWith("/embed/")) {
    return res.status(503).json({ error: "ES TEAMS TV is temporarily down for maintenance. Please try again later." });
  }
  return res.status(503).type("html").send(maintenanceHtml());
}
