// middleware/error-pages.js — the last two links in the middleware chain.
//
// Before this existed, anything that fell past the routes got Express's stock
// behavior, which is what a bare Express app does and not what a finished site
// does:
//   - An unknown URL returned the framework's plain-text "Cannot GET /whatever"
//     — no styling, and it advertises the stack it's running on.
//   - A route that threw (or rejected, or handed next() an error) returned a
//     500 page containing the full stack trace, since Express only hides it
//     when NODE_ENV=production is set — easy to forget, and worth not
//     depending on. Anyone hitting the bug got file paths and internals.
//
// Both now end at one place that renders in the site's own palette, says
// nothing about internals, and prints a request id the visitor can quote so a
// report can be matched to the exact line in the logs.
//
// Order matters: these two must be registered after every route, and the error
// handler must be last of all. Express identifies an error handler purely by
// its four-argument signature, so the unused `next` below has to stay.

import crypto from "crypto";

// A short id per request, echoed in the X-Request-Id response header, in every
// server-side log line about that request, and on the error page itself.
// Honors an id supplied by the edge (proxy/CDN) when there is one, so a single
// id follows the request across both sets of logs.
export function requestId(req, res, next) {
  const supplied = String(req.get("x-request-id") || "").trim();
  req.id = /^[A-Za-z0-9._-]{1,64}$/.test(supplied) ? supplied : crypto.randomBytes(8).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
}

// SAFETY NET, not a feature. This app runs on Express 4, where an async route
// handler that rejects is NOT routed to the error handler — the rejection
// surfaces as an unhandledRejection and the request itself just hangs, leaving
// the visitor on a spinner until their browser or the platform proxy gives up,
// with nothing in the logs tying the two together. The routes here all do
// their own try/catch, but one missed path should not be an invisible hang.
// If nothing has begun writing a response by the deadline, end it with a real
// error page and log the route so the underlying bug is findable.
//
// exemptPrefixes exists for responses that are meant to stay open — live HLS
// streams — where a deadline would be the bug.
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

// JSON callers get JSON. Anything else gets the page. Deciding by path rather
// than by Accept header keeps it predictable: fetch() from our own pages sends
// an Accept the browser also sends for navigations, so keying on that returns
// an HTML error document to code expecting JSON.
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

// eslint-disable-next-line no-unused-vars -- the 4th parameter is how Express recognizes an error handler
export function errorHandler(err, req, res, next) {
  // body-parser and friends attach a status to the errors they raise; those
  // are the caller's fault, not a server fault, and shouldn't be logged as
  // outages or reported as 500s. Anything without one is a genuine bug.
  const status = Number(err?.status || err?.statusCode) || 500;
  const id = req.id || "-";

  if (status >= 500) {
    console.error(`[${id}] ${req.method} ${req.originalUrl} — ${err?.stack || err}`);
  } else {
    console.warn(`[${id}] ${req.method} ${req.originalUrl} — ${status} ${err?.message || err}`);
  }

  // Something already started writing this response (a streamed HLS segment,
  // say). Anything appended now would corrupt it, so hand back to Express,
  // whose default in this case is to destroy the socket.
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
          ? "This one is on us. Try again in a moment — if it keeps happening, quote the reference below."
          : "Please check the address and try again.",
      id,
    })
  );
}
