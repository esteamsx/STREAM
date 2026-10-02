(function () {
  if (window.top !== window.self || window.__pnLoaded) return;
  window.__pnLoaded = true;

  var QUIET_KEY = "pn_quiet_until";
  var QUIET_MS = 10 * 60 * 1000;
  var FIRST_DELAY_MS = 1500;
  var ROTATE_MS = 30000;
  var MAX_ROTATIONS = 8;
  var SEEN_AFTER_MS = 1000;

  try {
    if (Number(sessionStorage.getItem(QUIET_KEY)) > Date.now()) return;
  } catch (e) {}

  var css = [
    ".pn-card{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:80;width:min(340px,calc(100vw - 92px));display:flex;gap:12px;align-items:stretch;padding:10px;border-radius:14px;background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),var(--card2,#1B1B27);color:var(--text,#F3F3FA);border:1px solid var(--border-strong,rgba(255,255,255,.16));box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);font-family:var(--font-body,Inter,-apple-system,sans-serif);transform:translateY(12px);opacity:0;transition:transform .24s cubic-bezier(.22,1,.36,1),opacity .24s ease}",
    ".pn-card.pn-in{transform:none;opacity:1}",
    ".pn-media{flex:0 0 88px;align-self:center;height:50px;border-radius:8px;background:rgba(127,127,127,.18) center/cover no-repeat;display:block}",
    ".pn-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}",
    ".pn-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted,rgba(255,255,255,.42))}",
    ".pn-tools{display:flex;align-items:center;gap:8px}",
    ".pn-meta a{color:inherit;text-decoration:none}",
    ".pn-meta a:hover{text-decoration:underline}",
    ".pn-close{background:none;border:0;padding:0 2px;margin:0;font-size:1rem;line-height:1;color:inherit;cursor:pointer}",
    ".pn-close:hover{color:var(--text,#F3F3FA)}",
    ".pn-title{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;font-size:.84rem;font-weight:600;line-height:1.3;color:inherit;text-decoration:none;word-break:break-word}",
    ".pn-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:.73rem;line-height:1.35;color:var(--muted,rgba(255,255,255,.55));word-break:break-word}",
    ".pn-cta{align-self:flex-start;margin-top:4px;padding:5px 11px;border-radius:7px;font-size:.72rem;font-weight:700;background:linear-gradient(90deg,var(--accent,#00E0FF),var(--accent2,#7c5cff));color:#04141a;text-decoration:none}",
    ".pn-card a:focus-visible,.pn-close:focus-visible{outline:2px solid var(--accent,#00E0FF);outline-offset:2px;border-radius:4px}",
    "@media (prefers-reduced-motion:reduce){.pn-card{transition:none;transform:none}}",
    "@media print{.pn-card{display:none}}"
  ].join("");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var card = null;
  var observer = null;
  var seenTimer = null;
  var current = null;
  var lastId = "";
  var rotations = 0;
  var timer = null;
  var stopped = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(className, ad, text) {
    var a = el("a", className, text);
    a.href = "/api/sp/go/" + encodeURIComponent(ad.t);
    a.target = "_blank";
    a.rel = "noopener noreferrer sponsored";
    return a;
  }

  function report(ad) {
    try {
      fetch("/api/sp/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: ad.t }),
        credentials: "same-origin",
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function clearSeen() {
    if (seenTimer) clearTimeout(seenTimer);
    seenTimer = null;
  }

  function armSeen(ad, visible) {
    clearSeen();
    if (!visible || document.visibilityState !== "visible") return;
    seenTimer = setTimeout(function () {
      if (current === ad && !ad.reported) {
        ad.reported = true;
        report(ad);
      }
    }, SEEN_AFTER_MS);
  }

  function teardown() {
    clearSeen();
    if (observer) observer.disconnect();
    observer = null;
    if (card && card.parentNode) card.parentNode.removeChild(card);
    card = null;
    current = null;
  }

  function dismiss() {
    stopped = true;
    if (timer) clearInterval(timer);
    try {
      sessionStorage.setItem(QUIET_KEY, String(Date.now() + QUIET_MS));
    } catch (e) {}
    teardown();
  }

  function render(ad) {
    teardown();
    current = ad;
    lastId = ad.id;

    card = el("aside", "pn-card");
    card.setAttribute("aria-label", "Sponsored");

    if (ad.img) {
      var media = link("pn-media", ad);
      media.style.backgroundImage = 'url("' + ad.img + '")';
      media.setAttribute("aria-hidden", "true");
      media.tabIndex = -1;
      card.appendChild(media);
    }

    var body = el("div", "pn-body");
    var meta = el("div", "pn-meta");
    meta.appendChild(el("span", null, "Sponsored"));
    var tools = el("div", "pn-tools");
    var advertise = el("a", null, "Advertise");
    advertise.href = "/promote";
    var close = el("button", "pn-close", "\u00d7");
    close.type = "button";
    close.setAttribute("aria-label", "Hide sponsored content");
    close.addEventListener("click", dismiss);
    tools.appendChild(advertise);
    tools.appendChild(close);
    meta.appendChild(tools);

    body.appendChild(meta);
    body.appendChild(link("pn-title", ad, ad.title));
    body.appendChild(el("div", "pn-text", ad.body));
    body.appendChild(link("pn-cta", ad, ad.cta));
    card.appendChild(body);

    document.body.appendChild(card);
    requestAnimationFrame(function () {
      if (card) card.classList.add("pn-in");
    });

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        function (entries) {
          armSeen(ad, entries[0].isIntersecting);
        },
        { threshold: 0.6 }
      );
      observer.observe(card);
    } else {
      armSeen(ad, true);
    }
  }

  function load() {
    if (stopped) return;
    fetch("/api/sp/next?last=" + encodeURIComponent(lastId), { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (stopped) return;
        if (!data || !data.ad) {
          teardown();
          return;
        }
        render(data.ad);
      })
      .catch(function () {});
  }

  function tick() {
    if (stopped || document.visibilityState !== "visible") return;
    rotations += 1;
    if (rotations > MAX_ROTATIONS) {
      clearInterval(timer);
      return;
    }
    load();
  }

  document.addEventListener("visibilitychange", function () {
    if (current && card && document.visibilityState === "visible") armSeen(current, true);
    else clearSeen();
  });

  document.addEventListener("fullscreenchange", function () {
    if (card) card.style.display = document.fullscreenElement ? "none" : "";
  });

  setTimeout(function () {
    load();
    timer = setInterval(tick, ROTATE_MS);
  }, FIRST_DELAY_MS);
})();
