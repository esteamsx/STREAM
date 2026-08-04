import { verifySession, getUserProfile, isAdminEmail, getMaintenanceStatus } from "../services/auth.js";

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

const MAINTENANCE_DURATION_MS = 24 * 60 * 60 * 1000;

function maintenanceHtml(enabledAt) {
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
  .logout-btn{
    position:fixed;top:16px;right:16px;background:transparent;border:1px solid rgba(255,255,255,.15);
    color:rgba(255,255,255,.6);font-size:.72rem;font-weight:600;padding:7px 14px;border-radius:20px;
    cursor:pointer;font-family:inherit;transition:all .2s ease;
  }
  .logout-btn:hover{color:#fff;border-color:rgba(255,255,255,.3)}
  .logout-btn:disabled{opacity:.6;cursor:default}
  .countdown{
    display:flex;align-items:center;gap:7px;margin-top:22px;padding:9px 16px;border-radius:20px;
    background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.25);color:#FF3B5C;
    font-size:.78rem;font-weight:600;
  }
  .countdown svg{width:15px;height:15px;flex-shrink:0}
  .countdown b{font-family:ui-monospace,'JetBrains Mono',monospace;font-weight:700;letter-spacing:.02em}
</style>
</head>
<body>
  <button type="button" class="logout-btn" id="logoutBtn">Log out</button>
  <div class="box">
    <div class="ring"></div>
    <h1>Maintenance in progress</h1>
    <p>We're making some improvements to ES TEAMS TV. Please try again later.</p>
    <div class="countdown" id="countdown">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
      Estimated Time: <b id="countdownText">24:00:00</b>
    </div>
    <div class="brand">ES TEAMS TV</div>
  </div>
  <script nonce="__CSP_NONCE__">
    document.getElementById('logoutBtn').addEventListener('click', function(){
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Logging out…';
      fetch('/api/logout', { method: 'POST' }).finally(function(){ window.location.href = '/login'; });
    });

    var enabledAt = ${JSON.stringify(enabledAt)};
    var DURATION_MS = ${MAINTENANCE_DURATION_MS};
    function pad(n){ return String(n).padStart(2, '0'); }
    function tick(){
      if (!enabledAt) return;
      var remain = Math.max(0, (enabledAt + DURATION_MS) - Date.now());
      var h = Math.floor(remain / 3600000);
      var m = Math.floor((remain % 3600000) / 60000);
      var s = Math.floor((remain % 60000) / 1000);
      document.getElementById('countdownText').textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    }
    if (enabledAt) {
      tick();
      setInterval(tick, 1000);
    } else {
      document.getElementById('countdown').style.display = 'none';
    }
  </script>
</body>
</html>`;
}

export async function maintenanceGate(req, res, next) {
  let status;
  try {
    status = await getMaintenanceStatus();
  } catch {
    return next();
  }
  if (!status.maintenanceMode) return next();
  if (ALLOWED_PATHS.has(req.path)) return next();

  try {
    const sessionId = req.cookies?.["__Host-session"];
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
  return res.status(503).type("html").send(maintenanceHtml(status.updatedAt));
}
