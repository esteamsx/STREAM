import {
  verifySession,
  getUserProfile,
  isAdminEmail,
  isVerificationActive,
  getMaintenanceStatus,
} from "../services/auth.js";

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
  "/api/paystack/webhook",
  "/health",
]);

const ALLOWED_PREFIXES = ["/pay/"];

function isAllowedPath(pathname) {
  if (ALLOWED_PATHS.has(pathname)) return true;
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function maintenanceHtml(untilMs) {
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
  .verified-note{
    margin-top:14px;display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:20px;
    background:rgba(0,224,255,.09);border:1px solid rgba(0,224,255,.25);color:#00E0FF;
    font-size:.76rem;font-weight:600;
  }
  .verified-note svg{width:14px;height:14px;flex-shrink:0}
  .cd-wrap{margin-top:24px;width:100%}
  .cd-label{
    font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    color:rgba(255,255,255,.4);margin-bottom:10px;
  }
  .cd-grid{display:flex;gap:8px;justify-content:center}
  .cd-cell{
    flex:1;max-width:78px;padding:11px 4px;border-radius:12px;
    background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.16);
    box-shadow:0 10px 26px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.2);
  }
  .cd-num{
    font-family:ui-monospace,'JetBrains Mono',monospace;font-size:1.32rem;font-weight:700;
    line-height:1.1;letter-spacing:-.02em;
  }
  .cd-unit{
    font-size:.56rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
    color:rgba(255,255,255,.42);margin-top:4px;
  }
</style>
</head>
<body>
  <button type="button" class="logout-btn" id="logoutBtn">Log out</button>
  <div class="box">
    <div class="ring"></div>
    <h1>Maintenance in Progress....</h1>
    <p>Please try again later.</p>
    <div class="verified-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      Only verified users are allowed
    </div>
    <div class="cd-wrap" id="countdown">
      <div class="cd-label">Back online in</div>
      <div class="cd-grid">
        <div class="cd-cell"><div class="cd-num" id="cdDays">00</div><div class="cd-unit">Days</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdHours">00</div><div class="cd-unit">Hours</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdMins">00</div><div class="cd-unit">Mins</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdSecs">00</div><div class="cd-unit">Secs</div></div>
      </div>
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

    var until = ${JSON.stringify(untilMs || null)};
    function pad(n){ return String(n).padStart(2, '0'); }
    function tick(){
      var remain = Math.max(0, until - Date.now());
      var d = Math.floor(remain / 86400000);
      var h = Math.floor((remain % 86400000) / 3600000);
      var m = Math.floor((remain % 3600000) / 60000);
      var s = Math.floor((remain % 60000) / 1000);
      document.getElementById('cdDays').textContent = pad(d);
      document.getElementById('cdHours').textContent = pad(h);
      document.getElementById('cdMins').textContent = pad(m);
      document.getElementById('cdSecs').textContent = pad(s);
      if (remain <= 0) window.location.reload();
    }
    if (until) {
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
  if (isAllowedPath(req.path)) return next();

  try {
    const sessionId = req.cookies?.session;
    const uid = sessionId ? await verifySession(sessionId) : null;
    if (uid) {
      const profile = await getUserProfile(uid);
      if (profile && isAdminEmail(profile.email)) return next();
      if (profile && isVerificationActive(profile)) return next();
    }
  } catch {
  }

  res.set("Cache-Control", "no-store");
  res.set("Retry-After", "3600");
  if (req.path.startsWith("/api/") || req.path.startsWith("/embed/")) {
    return res.status(503).json({
      error: "Maintenance in progress. Only verified users are allowed. Please try again later.",
      maintenanceUntil: status.until || null,
    });
  }
  return res.status(503).type("html").send(maintenanceHtml(status.until));
}
