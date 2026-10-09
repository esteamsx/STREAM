(function () {
  "use strict";
  if (window.__esDevtoolsGuard) return;
  window.__esDevtoolsGuard = true;

  var CHECK_MS = 1500;          // how often to look while the tab is visible
  var PAUSE_MS = 120;           // a "debugger" statement that takes longer than this means DevTools is open
  var STRIKES_TO_FLAG = 2;      // consecutive positive checks before the page reacts
  var CLEAR_TO_RELEASE = 3;     // consecutive clean checks before the page is released again

  var strikes = 0;
  var clean = 0;
  var flagged = false;
  var overlay = null;
  var hammer = null;
  var reported = false;

  function pauseSignal() {
    var start = performance.now();
    try { Function("debugger")(); } catch (e) {}
    return performance.now() - start > PAUSE_MS;
  }

  function consoleSignal() {
    var hit = false;
    try {
      var probe = new Error();
      Object.defineProperty(probe, "stack", {
        configurable: true,
        get: function () { hit = true; return ""; }
      });
      console.debug(probe);
    } catch (e) {}
    return hit;
  }

  function devtoolsOpen() {
    return pauseSignal() || consoleSignal();
  }

  function report() {
    if (reported) return;
    reported = true;
    try {
      var body = JSON.stringify({ path: location.pathname });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/security/devtools", new Blob([body], { type: "application/json" }));
      else fetch("/api/security/devtools", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
    } catch (e) {}
  }

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.setAttribute("role", "alertdialog");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483000", "display:flex", "align-items:center", "justify-content:center",
      "padding:24px", "text-align:center", "background:rgba(10,10,15,.94)",
      "-webkit-backdrop-filter:blur(10px)", "backdrop-filter:blur(10px)",
      "font-family:var(--font-body,Inter,-apple-system,system-ui,sans-serif)", "color:#F3F3FA"
    ].join(";");
    overlay.innerHTML =
      '<div style="max-width:340px">' +
        '<div style="width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#FF3B5C;background:rgba(255,59,92,.12);border:1px solid rgba(255,59,92,.4);box-shadow:0 0 24px rgba(255,59,92,.3)">' +
          '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9.5v4.2M12 17h.01"/></svg>' +
        '</div>' +
        '<div style="font-family:var(--font-display,\'Space Grotesk\',Inter,sans-serif);font-size:1.15rem;font-weight:700;margin-bottom:8px">Developer tools detected</div>' +
        '<div style="font-size:.88rem;line-height:1.55;color:rgba(255,255,255,.6)">Close developer tools to continue using this page.</div>' +
      '</div>';
    document.documentElement.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function flag() {
    if (flagged) return;
    flagged = true;
    showOverlay();
    report();
    hammer = setInterval(function () {
      try { console.clear(); } catch (e) {}
      try { Function("debugger")(); } catch (e) {}
    }, 250);
  }

  function release() {
    if (!flagged) return;
    flagged = false;
    reported = false;
    if (hammer) { clearInterval(hammer); hammer = null; }
    hideOverlay();
  }

  function tick() {
    if (document.hidden) return;
    if (devtoolsOpen()) {
      clean = 0;
      strikes++;
      if (strikes >= STRIKES_TO_FLAG) flag();
    } else {
      strikes = 0;
      clean++;
      if (clean >= CLEAR_TO_RELEASE) release();
    }
  }

  setInterval(tick, CHECK_MS);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(tick, 350);
  });
  document.addEventListener("visibilitychange", function () {
    strikes = 0;
    if (!document.hidden) setTimeout(tick, 200);
  });

  document.addEventListener("contextmenu", function (e) {
    if (e.target && e.target.closest && e.target.closest("a, button, img, [role=\"button\"]")) e.preventDefault();
  });
})();
