(function () {
  "use strict";
  if (window.EsPrivate) return;

  var GIB = 1024 * 1024 * 1024;

  function chromiumPrivate() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (est) {
      var quota = est && est.quota;
      if (!quota) return null;
      var heap = (window.performance && performance.memory && performance.memory.jsHeapSizeLimit) || GIB;
      return quota < heap * 2 && quota < 6 * GIB;
    }).catch(function () { return null; });
  }

  function firefoxPrivate() {
    return Promise.resolve(navigator.serviceWorker === undefined);
  }

  function safariPrivate() {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== "function") return Promise.resolve(null);
    return navigator.storage.getDirectory().then(function () { return false; }, function (e) {
      return /transient|security|not allowed/i.test(String((e && (e.message || e.name)) || ""));
    });
  }

  function detect() {
    var ua = navigator.userAgent || "";
    if (/bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|bingpreview|pingdom|uptime/i.test(ua)) return Promise.resolve(null);
    try {
      if (/Firefox\//.test(ua) && !/Seamonkey/.test(ua)) return firefoxPrivate();
      if (/Chrome|Chromium|Edg\/|OPR\//.test(ua) && !/CriOS|FxiOS/.test(ua)) return chromiumPrivate();
      if (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua)) return safariPrivate();
    } catch (e) {}
    return Promise.resolve(null);
  }

  var overlay = null;

  function css() {
    if (document.getElementById("esPrivateCss")) return;
    var st = document.createElement("style");
    st.id = "esPrivateCss";
    st.textContent = [
      ".es-pv-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:rgba(10,10,15,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:var(--font-body,Inter,-apple-system,system-ui,sans-serif);color:#F3F3FA}",
      ".es-pv-box{max-width:340px;display:flex;flex-direction:column;align-items:center}",
      ".es-pv-icon{position:relative;width:84px;height:84px;border-radius:50%;margin:0 0 30px;display:flex;align-items:center;justify-content:center;color:#7c5cff;background:rgba(124,92,255,.12);border:1px solid rgba(124,92,255,.4);box-shadow:0 0 28px rgba(124,92,255,.32);animation:esPvPulse 2s ease-in-out infinite}",
      ".es-pv-icon::before,.es-pv-icon::after{content:\"\";position:absolute;inset:-1px;border-radius:50%;border:2px solid rgba(124,92,255,.55);animation:esPvRipple 2.4s ease-out infinite}",
      ".es-pv-icon::after{animation-delay:1.2s}",
      ".es-pv-icon svg{width:44px;height:44px}",
      ".es-pv-eyes{animation:esPvBlink 3.4s ease-in-out infinite;transform-origin:50% 17px}",
      "@keyframes esPvPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}",
      "@keyframes esPvRipple{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}",
      "@keyframes esPvBlink{0%,88%,100%{transform:scaleY(1)}92%{transform:scaleY(.15)}}",
      ".es-pv-title{font-family:var(--font-display,'Space Grotesk',Inter,sans-serif);font-size:1.25rem;font-weight:700;margin-bottom:10px}",
      ".es-pv-text{font-size:.88rem;line-height:1.6;color:rgba(255,255,255,.58)}",
      ".es-pv-btn{margin-top:24px;padding:11px 26px;border:0;border-radius:12px;font-weight:700;font-size:.85rem;font-family:inherit;cursor:pointer;color:#04141a;background:linear-gradient(135deg,#00E0FF,#7c5cff)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function show() {
    if (overlay) return;
    css();
    overlay = document.createElement("div");
    overlay.className = "es-pv-ov";
    overlay.setAttribute("role", "alertdialog");
    overlay.innerHTML =
      '<div class="es-pv-box">' +
        '<div class="es-pv-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 11l2.1-5.8A2 2 0 017 4h10a2 2 0 011.9 1.2L21 11"/><path d="M2 11h20"/>' +
            '<g class="es-pv-eyes"><circle cx="7.5" cy="17" r="2.8"/><circle cx="16.5" cy="17" r="2.8"/><path d="M10.3 17h3.4"/></g>' +
          '</svg>' +
        '</div>' +
        '<div class="es-pv-title">Private browsing detected</div>' +
        '<div class="es-pv-text">To use this site, leave incognito or private mode and open it in a normal browser window.</div>' +
        '<button type="button" class="es-pv-btn">Try again</button>' +
      '</div>';
    overlay.querySelector(".es-pv-btn").addEventListener("click", function () { location.reload(); });
    document.documentElement.appendChild(overlay);
  }

  function gate() {
    return detect().then(function (isPrivate) {
      window.__esPrivateMode = isPrivate === true;
      if (isPrivate === true) show();
      return isPrivate;
    });
  }

  window.EsPrivate = { detect: detect, gate: gate };
  gate();
})();
