
const NEVER_LOCK = new Set(["/health", "/robots.txt", "/outbound-ip", "/site.webmanifest", "/security.txt", "/verify", "/reset", "/s", "/api", "/embed", "/stream", "/hls"]);

function topSegment(path) {
  if (typeof path !== "string" || path[0] !== "/" || path === "/") return null;
  const seg = "/" + path.split("/")[1];
  if (/[:*()?+.]/.test(seg)) return null;
  return NEVER_LOCK.has(seg) ? null : seg;
}

function trimSlash(p) {
  return String(p).length > 1 ? String(p).replace(/\/+$/, "") : String(p);
}

function isCovered(lockable, seg) {
  return Object.keys(lockable).some((key) => {
    const paths = lockable[key].pagePaths || [key];
    return paths.some((p) => trimSlash(p) === seg);
  });
}

export function discoverLockablePages(app, lockable) {
  const router = app && (app._router || app.router);
  const found = new Set();

  const visit = (stack) => {
    for (const layer of stack || []) {
      if (layer.route) {
        if (!layer.route.methods || !layer.route.methods.get) continue;
        for (const p of [].concat(layer.route.path)) {
          const seg = topSegment(p);
          if (seg) found.add(seg);
        }
      } else if (layer.name === "router" && layer.handle && layer.handle.stack && layer.regexp && layer.regexp.fast_slash) {
        visit(layer.handle.stack);
      }
    }
  };
  visit(router && router.stack);

  const added = [];
  for (const seg of [...found].sort()) {
    if (lockable[seg] || isCovered(lockable, seg)) continue;
    lockable[seg] = { label: seg, pagePaths: [seg], apiPrefixes: ["/api" + seg], auto: true };
    added.push(seg);
  }
  if (added.length) console.log("[page-lock] pages found automatically and now lockable: " + added.join(", "));
  return added;
}
