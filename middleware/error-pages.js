
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
  .box{max-width:440px}
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
  res.status(404).type("html").send(
    errorPageHtml({
      code: "404",
      title: "This page doesn't exist",
      message: "The link may be broken, or the page may have been moved.",
      id: "",
    })
  );
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
