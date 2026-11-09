const PHYSICS_SCRIPT_TAG = '<script nonce="__CSP_NONCE__" src="/ios-physics-scroll.js" defer></script>';
const MOTION_SCRIPT_TAG = '<script nonce="__CSP_NONCE__" src="/ios-motion.js" defer></script>';
const HTML_PAGE_RE = /^\s*<(!doctype|html)/i;

function addAttribute(tag, attribute) {
  if (new RegExp(`\\b${attribute}\\s*=`, "i").test(tag) || new RegExp(`\\b${attribute}\\b`, "i").test(tag)) return tag;
  return tag.replace(/\s*(\/?>)$/, ` ${attribute}$1`);
}

function markNativeScrollSurfaces(html) {
  html = html.replace(/<(video|iframe|canvas)\b[^>]*>/gi, (tag) => addAttribute(tag, "data-no-smooth"));
  return html.replace(/<([a-z][\w:-]*)\b([^>]*(?:class|id)\s*=\s*["'][^"']*(?:chat|comments?|feed|messages?|thread|map)[^"']*["'][^>]*)>/gi, (full) => addAttribute(full, "data-no-smooth"));
}

function markMainWrapper(html) {
  if (/\bdata-ios-rubber\b/i.test(html)) return html;

  const candidates = [
    /<main\b[^>]*>/i,
    /<div\b[^>]*\bid=["'](?:accWrap|pfWrap|trViewsClip|toolsScroll)["'][^>]*>/i,
    /<div\b[^>]*\bclass=["'](?:auth-wrap|v-wrap|container|wrap|cr-wrap|db-wrap)["'][^>]*>/i,
  ];
  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (!match) continue;
    return html.slice(0, match.index) + addAttribute(match[0], "data-ios-rubber") + html.slice(match.index + match[0].length);
  }
  return html;
}

export function enhanceIosPhysicsPage(req, res, next) {
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && res.statusCode < 400 && HTML_PAGE_RE.test(body) && body.indexOf("</body>") !== -1) {
      body = markMainWrapper(body);
      body = markNativeScrollSurfaces(body);
      if (body.indexOf("/ios-physics-scroll.js") === -1) {
        body = body.replace("</body>", `${PHYSICS_SCRIPT_TAG}${MOTION_SCRIPT_TAG}</body>`);
      } else if (body.indexOf("/ios-motion.js") === -1) {
        body = body.replace("</body>", `${MOTION_SCRIPT_TAG}</body>`);
      }
    }
    return originalSend(body);
  };
  next();
}
