(function () {
  "use strict";
  if (window.EsPrivate) return;

  var WORKER_SRC =
    "self.onmessage=async function(){try{" +
      "var root=await navigator.storage.getDirectory();" +
      "var name='ig_'+Math.random().toString(36).slice(2);" +
      "var fh=await root.getFileHandle(name,{create:true});" +
      "var h=await fh.createSyncAccessHandle();" +
      "var buf=new Uint8Array(1);var times=[];" +
      "for(var i=0;i<3;i++){h.write(buf,{at:0});var t0=performance.now();h.flush();times.push(performance.now()-t0);}" +
      "h.close();await root.removeEntry(name);" +
      "self.postMessage(Math.min.apply(null,times)<0.1);" +
    "}catch(e){self.postMessage(null);}};";

  function opfsRun() {
    return new Promise(function (resolve) {
      var done = false, url = null, worker = null, timer = null;
      function finish(v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { worker && worker.terminate(); } catch (e) {}
        try { url && URL.revokeObjectURL(url); } catch (e) {}
        resolve(v);
      }
      try {
        if (!navigator.storage || typeof navigator.storage.getDirectory !== "function" || typeof Worker === "undefined") return resolve(null);
        url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "application/javascript" }));
        worker = new Worker(url);
        timer = setTimeout(function () { finish(null); }, 3500);
        worker.onmessage = function (e) { finish(e.data === true ? true : (e.data === false ? false : null)); };
        worker.onerror = function () { finish(null); };
        worker.postMessage(1);
      } catch (e) { finish(null); }
    });
  }

  var sig = {};

  function timeout(ms, fn) { return setTimeout(fn, ms); }

  function anyTrue(promises) {
    return new Promise(function (resolve) {
      var left = promises.length, sawFalse = false;
      function step(v) {
        if (v === true) return resolve(true);
        if (v === false) sawFalse = true;
        if (--left === 0) resolve(sawFalse ? false : null);
      }
      promises.forEach(function (p) { p.then(step, function () { step(null); }); });
    });
  }

  function quotaSignal() {
    return new Promise(function (resolve) {
      var done = false;
      var timer = timeout(2500, function () { finish(null); });
      function finish(v) { if (done) return; done = true; clearTimeout(timer); resolve(v); }
      var heap = 1073741824;
      try { if (performance && performance.memory && performance.memory.jsHeapSizeLimit) heap = performance.memory.jsHeapSizeLimit; } catch (e) {}
      var limitMiB = Math.round(heap / 1048576) * 2;
      sig.quotaLimitMiB = limitMiB;
      function judge(quota) {
        if (typeof quota !== "number" || !isFinite(quota)) return finish(null);
        sig.quotaMiB = Math.round(quota / 1048576);
        finish(sig.quotaMiB < limitMiB);
      }
      try {
        if (navigator.webkitTemporaryStorage && navigator.webkitTemporaryStorage.queryUsageAndQuota) {
          navigator.webkitTemporaryStorage.queryUsageAndQuota(function (_, quota) { judge(quota); }, function () { finish(null); });
        } else if (navigator.storage && typeof navigator.storage.estimate === "function") {
          navigator.storage.estimate().then(function (e) { judge(e && e.quota); }, function () { finish(null); });
        } else finish(null);
      } catch (e) { finish(null); }
    });
  }

  function opfsTimingSignal() {
    return opfsRun().then(function (first) {
      sig.opfsFirst = first;
      if (first !== true) return first === false ? false : null;
      return opfsRun().then(function (second) { sig.opfsSecond = second; return second === true; });
    });
  }

  function chromiumPrivate() {
    return anyTrue([quotaSignal(), opfsTimingSignal()]);
  }

  function firefoxPrivate() {
    sig.serviceWorker = navigator.serviceWorker !== undefined;
    return Promise.resolve(navigator.serviceWorker === undefined);
  }

  function idbBlobSignal() {
    return new Promise(function (resolve) {
      var done = false, name = "ig_" + Math.random().toString(36).slice(2), db = null;
      var timer = timeout(3000, function () { finish(null); });
      function finish(v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { db && db.close(); indexedDB.deleteDatabase(name); } catch (e) {}
        resolve(v);
      }
      try {
        if (!window.indexedDB || typeof Blob === "undefined") return finish(null);
        var req = indexedDB.open(name, 1);
        req.onerror = function () { sig.idbError = String((req.error && (req.error.message || req.error.name)) || "error"); finish(null); };
        req.onupgradeneeded = function (ev) {
          db = ev.target.result;
          try {
            db.createObjectStore("t", { autoIncrement: true }).put(new Blob());
            sig.idbBlob = "ok";
            finish(false);
          } catch (e) {
            var msg = String((e && (e.message || e.name)) || e);
            sig.idbBlob = msg;
            finish(/BlobURLs are not yet supported|not yet supported/i.test(msg) ? true : null);
          }
        };
      } catch (e) { finish(null); }
    });
  }

  function opfsDirSignal() {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== "function") return Promise.resolve(null);
    return navigator.storage.getDirectory().then(function () { sig.opfsDir = "ok"; return false; }, function (e) {
      var msg = String((e && (e.message || e.name)) || "");
      sig.opfsDir = msg;
      return /transient|security|not allowed|insecure/i.test(msg);
    });
  }

  function safariPrivate() {
    return anyTrue([idbBlobSignal(), opfsDirSignal()]);
  }

  function detect() {
    var ua = navigator.userAgent || "";
    if (/bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|bingpreview|pingdom|uptime/i.test(ua)) return Promise.resolve(null);
    try {
      var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS) return safariPrivate();
      if (/Firefox\//.test(ua) && !/Seamonkey/.test(ua)) return firefoxPrivate();
      if (/Chrome|Chromium|Edg\/|OPR\/|SamsungBrowser/.test(ua)) return chromiumPrivate();
      if (/Safari/.test(ua)) return safariPrivate();
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
      ".es-pv-steps{margin:20px 0 0;padding:0;list-style:none;text-align:left;width:100%;counter-reset:pv}",
      ".es-pv-steps li{counter-increment:pv;position:relative;padding:0 0 0 30px;margin:0 0 10px;font-size:.82rem;line-height:1.5;color:rgba(255,255,255,.58)}",
      ".es-pv-steps li::before{content:counter(pv);position:absolute;left:0;top:1px;width:20px;height:20px;border-radius:50%;background:rgba(124,92,255,.14);border:1px solid rgba(124,92,255,.4);color:#7c5cff;font-size:.68rem;font-weight:700;display:flex;align-items:center;justify-content:center}",
      ".es-pv-btn.es-pv-contact{margin-top:6px;color:#F3F3FA;background:transparent;border:1px solid rgba(255,255,255,.22)}",
      ".es-pv-btn{margin-top:24px;padding:11px 26px;border:0;border-radius:12px;font-weight:700;font-size:.85rem;font-family:inherit;cursor:pointer;color:#04141a;background:linear-gradient(135deg,#00E0FF,#7c5cff)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function openSupport() {
    if (window.EsVisitorSupport) return window.EsVisitorSupport.open("private");
    var sc = document.createElement("script");
    sc.src = "/visitor-support.js";
    sc.onload = function () { if (window.EsVisitorSupport) window.EsVisitorSupport.open("private"); };
    document.head.appendChild(sc);
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
        '<button type="button" class="es-pv-btn es-pv-retry">Try again</button>' +
        '<ol class="es-pv-steps">' +
          '<li>Close this private or incognito tab.</li>' +
          '<li>Open the site in a normal browser window, then tap <b>Try again</b>.</li>' +
          '<li>Still seeing this in a normal window? Clear your browser cache and cookies, then open the site again.</li>' +
          '<li>Need a hand? Contact support and we will sort it out.</li>' +
        '</ol>' +
        '<button type="button" class="es-pv-btn es-pv-contact">Contact Support</button>' +
      '</div>';
    overlay.querySelector(".es-pv-retry").addEventListener("click", function () { location.reload(); });
    overlay.querySelector(".es-pv-contact").addEventListener("click", openSupport);
    document.documentElement.appendChild(overlay);
  }

  function gate() {
    return detect().then(function (isPrivate) {
      window.__esPrivateMode = isPrivate === true;
      if (isPrivate === true) show();
      return isPrivate;
    });
  }

  function showDiag(result) {
    try {
      var box = document.createElement("pre");
      box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;max-height:45vh;overflow:auto;margin:0;padding:10px;border-radius:10px;font:11px/1.45 monospace;color:#d8f7ff;background:rgba(0,0,0,.92);border:1px solid rgba(255,255,255,.2);z-index:2147483647;white-space:pre-wrap;word-break:break-all";
      sig.result = result === true ? "PRIVATE" : (result === false ? "normal" : "unknown");
      sig.ua = navigator.userAgent;
      try { sig.jsHeapLimitMiB = Math.round(performance.memory.jsHeapSizeLimit / 1048576); } catch (e) {}
      box.textContent = "Private-mode check\n" + JSON.stringify(sig, null, 1);
      document.documentElement.appendChild(box);
    } catch (e) {}
  }

  window.EsPrivate = { detect: detect, gate: gate };
  gate().then(function (r) { if (/[?&]pvdiag=1/.test(location.search)) showDiag(r); });
})();
