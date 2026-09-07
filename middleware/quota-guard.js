import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), ".quota-maintenance.json");

const ALLOWED_PATHS = new Set(["/health", "/api/logout"]);

function isQuotaExceededError(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  return err.code === 8 || /quota exceeded/i.test(msg) || /resource_exhausted/i.test(msg);
}

function nextEightAmWAT(fromMs) {
  const from = new Date(fromMs);
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 7, 0, 0, 0));
  if (from.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime();
}

function markQuotaExceeded() {
  try {
    if (fs.existsSync(STATE_FILE)) return;
    const until = nextEightAmWAT(Date.now());
    fs.writeFileSync(STATE_FILE, JSON.stringify({ until, setAt: Date.now() }));
    console.error("[quota-guard] Firestore quota exceeded, showing maintenance page until " + new Date(until).toISOString());
  } catch (writeErr) {
  }
}

function checkQuotaError(err) {
  if (isQuotaExceededError(err)) markQuotaExceeded();
}

function getQuotaMaintenanceUntil() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!data.until || Date.now() >= data.until) {
      fs.unlinkSync(STATE_FILE);
      return null;
    }
    return data.until;
  } catch (readErr) {
    return null;
  }
}

function quotaMaintenanceHtml(untilMs) {
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
  <div class="box">
    <div class="ring"></div>
    <h1>Site is undergoing Maintenance</h1>
    <p>Please try again shortly.</p>
    <div class="cd-wrap" id="countdown">
      <div class="cd-label">Back online in</div>
      <div class="cd-grid">
        <div class="cd-cell"><div class="cd-num" id="cdHours">00</div><div class="cd-unit">Hours</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdMins">00</div><div class="cd-unit">Mins</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdSecs">00</div><div class="cd-unit">Secs</div></div>
      </div>
    </div>
    <div class="brand">ES TEAMS TV</div>
  </div>
  <script nonce="__CSP_NONCE__">
    var until = ${JSON.stringify(untilMs)};
    function pad(n){ return String(n).padStart(2, '0'); }
    function tick(){
      var remain = Math.max(0, until - Date.now());
      var h = Math.floor(remain / 3600000);
      var m = Math.floor((remain % 3600000) / 60000);
      var s = Math.floor((remain % 60000) / 1000);
      document.getElementById('cdHours').textContent = pad(h);
      document.getElementById('cdMins').textContent = pad(m);
      document.getElementById('cdSecs').textContent = pad(s);
      if (remain <= 0) window.location.reload();
    }
    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>`;
}

function quotaMaintenanceGate(req, res, next) {
  if (ALLOWED_PATHS.has(req.path)) return next();
  const until = getQuotaMaintenanceUntil();
  if (!until) return next();

  res.set("Cache-Control", "no-store");
  res.set("Retry-After", "3600");
  if (req.path.startsWith("/api/") || req.path.startsWith("/embed/")) {
    return res.status(503).json({
      error: "Site is undergoing maintenance. Please try again shortly.",
      maintenanceUntil: until,
    });
  }
  return res.status(503).type("html").send(quotaMaintenanceHtml(until));
}

export { checkQuotaError, markQuotaExceeded, getQuotaMaintenanceUntil, quotaMaintenanceGate, isQuotaExceededError };
