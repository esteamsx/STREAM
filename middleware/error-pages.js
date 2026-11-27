
import crypto from "crypto";

export function requestId(req, res, next) {
  const supplied = String(req.get("x-request-id") || "").trim();
  req.id = /^[A-Za-z0-9._-]{1,64}$/.test(supplied) ? supplied : crypto.randomBytes(8).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
}

export function responseWatchdog({ timeoutMs = 30000, exemptPrefixes = [] } = {}) {
  return (req, res, next) => {
    if (exemptPrefixes.some((p) => req.path.startsWith(p))) return next();

    const timer = setTimeout(() => {
      if (res.headersSent || res.writableEnded) return;
      next(Object.assign(new Error(`No response after ${timeoutMs}ms`), { status: 503 }));
    }, timeoutMs);
    timer.unref();

    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);
    next();
  };
}

function wantsJson(req) {
  return req.path.startsWith("/api/") || req.path.startsWith("/embed/");
}

function errorPageHtml({ code, title, message, id }) {
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
    background:#0A0A0F;color:#e8e8f0;font-family:system-ui,-apple-system,sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;padding:24px;text-align:center;
  }
  .box{width:100%;max-width:440px;padding:26px 22px;border:1px solid rgba(255,255,255,.17);border-radius:20px;
    background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.025) 44%,rgba(255,255,255,.06)),rgba(18,20,32,.58);
    box-shadow:0 18px 48px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.2);backdrop-filter:blur(12px) saturate(125%);-webkit-backdrop-filter:blur(12px) saturate(125%)}
  .code{font-size:2.2rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px;color:#00E0FF}
  h1{font-size:1.05rem;margin:0 0 10px;font-weight:700}
  p{color:#8a8a9a;font-size:.85rem;line-height:1.6;margin:0 0 8px}
  a{color:#00E0FF;text-decoration:none;border-bottom:1px solid rgba(0,224,255,.35);font-size:.85rem}
  .id{color:#4a4a58;font-size:.7rem;margin-top:18px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
</style>
</head>
<body>
  <div class="box">
    <p class="code">${code}</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="/">Back to ES TEAMS TV</a></p>
    ${id ? `<p class="id">Reference: ${id}</p>` : ""}
  </div>
</body>
</html>`;
}

export function notFoundHandler(req, res) {
  res.set("Cache-Control", "no-store");
  if (wantsJson(req)) return res.status(404).json({ error: "Not found." });
  res.status(404).type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0A0A0F">
<title>Page not found · ES TEAMS TV</title>
<style>
  *{box-sizing:border-box}
  :root{color-scheme:dark;--accent:#00E0FF;--accent2:#7c5cff;--text:#F3F3FA;--muted:rgba(243,243,250,.62);--ease:cubic-bezier(.22,1,.36,1)}
  html,body{min-height:100%;margin:0}
  body{min-height:100svh;display:grid;place-items:center;overflow:hidden;padding:24px;background:#0A0A0F;color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
  .nf-glow{position:fixed;width:min(68vw,640px);aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(0,224,255,.12),rgba(124,92,255,.07) 38%,transparent 70%);filter:blur(16px);pointer-events:none}
  .nf-card{position:relative;width:min(100%,490px);padding:clamp(27px,7vw,42px) clamp(22px,6vw,38px);border:1px solid rgba(255,255,255,.19);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.035) 45%,rgba(255,255,255,.07)),rgba(18,20,32,.62);box-shadow:0 28px 90px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.23);-webkit-backdrop-filter:blur(26px) saturate(145%);backdrop-filter:blur(26px) saturate(145%);animation:nf-arrive .72s var(--ease) both}
  .nf-brand{display:inline-flex;align-items:center;gap:9px;color:var(--text);font-size:.82rem;font-weight:750;letter-spacing:.025em;text-decoration:none}
  .nf-brand img{width:28px;height:28px;border-radius:8px;box-shadow:0 0 22px rgba(0,224,255,.2)}
  .nf-code{margin:28px 0 2px;font-size:clamp(6rem,24vw,9.5rem);font-weight:850;line-height:.82;letter-spacing:-.095em;color:transparent;background:linear-gradient(145deg,#fff 9%,#9af5ff 49%,#8e7aff 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 8px 28px rgba(0,224,255,.15));animation:nf-float 5s ease-in-out 1s infinite}
  h1{margin:24px 0 9px;font-size:clamp(1.15rem,4vw,1.4rem);letter-spacing:-.025em}
  .nf-copy{max-width:340px;margin:0 auto;color:var(--muted);font-size:.9rem;line-height:1.65}
  .nf-home{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;margin-top:27px;padding:0 19px;border:1px solid rgba(0,224,255,.48);border-radius:15px;background:linear-gradient(135deg,rgba(0,224,255,.2),rgba(124,92,255,.2)),rgba(255,255,255,.07);box-shadow:0 10px 30px rgba(0,224,255,.12),inset 0 1px 0 rgba(255,255,255,.17);color:#F3F3FA;font-size:.88rem;font-weight:700;text-decoration:none;transition:transform .24s var(--ease),border-color .24s ease,box-shadow .24s ease,background .24s ease}
  .nf-home:hover{transform:translateY(-3px);border-color:rgba(0,224,255,.82);background:linear-gradient(135deg,rgba(0,224,255,.28),rgba(124,92,255,.26)),rgba(255,255,255,.09);box-shadow:0 15px 36px rgba(0,224,255,.2),inset 0 1px 0 rgba(255,255,255,.2)}
  .nf-home:active{transform:scale(.97)}
  .nf-home:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
  .nf-home svg{width:17px;height:17px;transition:transform .24s var(--ease)}
  .nf-home:hover svg{transform:translate(2px,-2px)}
  @keyframes nf-arrive{from{opacity:0;transform:translateY(18px) scale(.975);filter:blur(8px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
  @keyframes nf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
</style>
</head>
<body>
  <div class="nf-glow" aria-hidden="true"></div>
  <main class="nf-card" aria-labelledby="nf-title">
    <a class="nf-brand" href="/" aria-label="ES TEAMS TV home"><img src="/icon-32.png" alt="" width="28" height="28"><span>ES TEAMS TV</span></a>
    <div class="nf-code" aria-hidden="true">404</div>
    <h1 id="nf-title">This page doesn't exist</h1>
    <p class="nf-copy">The link may be broken, or the page may have been moved.</p>
    <a class="nf-home" href="/">Back to home
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
    </a>
  </main>
</body>
</html>`);
}

export function errorHandler(err, req, res, next) {
  const status = Number(err?.status || err?.statusCode) || 500;
  const id = req.id || "-";

  if (status >= 500) {
    console.error(`[${id}] ${req.method} ${req.originalUrl}: ${err?.stack || err}`);
  } else {
    console.warn(`[${id}] ${req.method} ${req.originalUrl}: ${status} ${err?.message || err}`);
  }

  if (res.headersSent) return next(err);

  res.set("Cache-Control", "no-store");

  if (wantsJson(req)) {
    const message =
      err?.type === "entity.too.large"
        ? "That upload is too large."
        : err?.type === "entity.parse.failed"
          ? "Malformed request body."
          : status >= 500
            ? "Something went wrong on our end."
            : err?.message || "Request failed.";
    return res.status(status).json({ error: message, ref: id });
  }

  res.status(status).type("html").send(
    errorPageHtml({
      code: String(status),
      title: status >= 500 ? "Something went wrong" : "That request couldn't be handled",
      message:
        status >= 500
          ? "This one is on us. Try again in a moment, and if it keeps happening, quote the reference below."
          : "Please check the address and try again.",
      id,
    })
  );
}
