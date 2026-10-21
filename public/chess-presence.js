/* Site-wide chess presence.
   Keeps a logged-in user "online" for chess on every page of the site and shows
   an Accept / Decline popup when someone challenges them. The /chess page has
   its own connection, so this script does nothing there. */
(function () {
  "use strict";
  if (window.__cxPresence) return;
  window.__cxPresence = true;
  if (/^\/chess(\/|$)/.test(location.pathname)) return;
  if (!window.EventSource) return;

  var es = null;
  var retryTimer = null;
  var retries = 0;
  var offset = 0;
  var incoming = [];
  var ctx = null;
  var opened = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function post(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || "Something went wrong. Please try again."); e.code = d.code; throw e; }
        return d;
      });
    });
  }

  function ping() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!ctx) ctx = new C();
      if (ctx.state === "suspended") ctx.resume();
      [880, 1175].forEach(function (f, i) {
        var t = ctx.currentTime + i * 0.12;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.25);
      });
    } catch (e) { /* sound is optional */ }
  }

  function injectCss() {
    if (document.getElementById("cxpStyle")) return;
    var st = document.createElement("style");
    st.id = "cxpStyle";
    st.textContent =
      "@keyframes cxpIn{from{opacity:0;transform:translateY(-16px) scale(.96)}to{opacity:1;transform:none}}" +
      "#cxpStack{position:fixed;left:0;right:0;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 12px;pointer-events:none}" +
      ".cxp-card{pointer-events:auto;width:100%;max-width:380px;padding:14px;border-radius:20px;color:var(--text,#F3F3FA);font-family:var(--font-body,Inter,-apple-system,sans-serif);" +
      "background:linear-gradient(155deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 40%,rgba(255,255,255,.06) 100%),rgba(255,255,255,.06);" +
      "backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);border:1px solid rgba(255,255,255,.24);" +
      "box-shadow:0 18px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);animation:cxpIn .4s cubic-bezier(.2,.9,.3,1.2) both}" +
      ":root[data-theme='light'] .cxp-card{background:linear-gradient(155deg,rgba(255,255,255,.8),rgba(255,255,255,.45)),rgba(255,255,255,.7);border-color:rgba(255,255,255,.8);box-shadow:0 18px 50px rgba(20,20,28,.2),inset 0 1px 0 rgba(255,255,255,.9)}" +
      ".cxp-row{display:flex;align-items:center;gap:12px}" +
      ".cxp-av{width:46px;height:46px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:#04141a;background:linear-gradient(135deg,var(--accent,#00E0FF),var(--accent2,#7c5cff))}" +
      ".cxp-av img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".cxp-txt{min-width:0;flex:1}" +
      ".cxp-txt b{display:block;font-size:.92rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".cxp-txt span{display:block;margin-top:2px;font-size:.76rem;color:var(--muted,rgba(255,255,255,.6))}" +
      ".cxp-acts{display:flex;gap:10px;margin-top:12px}" +
      ".cxp-btn{flex:1;padding:11px;border-radius:13px;font-family:inherit;font-weight:700;font-size:.86rem;cursor:pointer;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:var(--text,#F3F3FA)}" +
      ".cxp-btn.go{border:none;color:#04141a;background:linear-gradient(90deg,var(--accent,#00E0FF),var(--accent2,#7c5cff));box-shadow:0 8px 22px rgba(0,224,255,.25)}" +
      ".cxp-btn[disabled]{opacity:.6;cursor:default}" +
      ":root[data-theme='light'] .cxp-btn{border-color:rgba(20,20,40,.16);background:rgba(255,255,255,.6)}";
    document.head.appendChild(st);
  }

  function stack() {
    var s = document.getElementById("cxpStack");
    if (!s) { s = document.createElement("div"); s.id = "cxpStack"; document.body.appendChild(s); }
    return s;
  }

  function removeCard(id) {
    incoming = incoming.filter(function (c) { return c.id !== id; });
    var el = document.querySelector('.cxp-card[data-id="' + id + '"]');
    if (el) el.remove();
    var s = document.getElementById("cxpStack");
    if (s && !s.children.length) s.remove();
  }

  function showCard(c) {
    if (document.querySelector('.cxp-card[data-id="' + c.id + '"]')) return;
    if (c.expiresAt && c.expiresAt - (Date.now() + offset) <= 0) return;
    injectCss();
    var from = c.from || {};
    var nm = from.name || from.username || "Someone";
    var letter = nm.trim().charAt(0).toUpperCase() || "?";
    var card = document.createElement("div");
    card.className = "cxp-card";
    card.setAttribute("data-id", c.id);
    card.setAttribute("role", "alertdialog");
    card.innerHTML =
      '<div class="cxp-row"><div class="cxp-av">' + (from.photo ? "" : esc(letter)) + '</div>' +
      '<div class="cxp-txt"><b>' + esc(nm) + '</b><span>challenged you to chess | ' + esc(c.minutes) + ' min</span></div></div>' +
      '<div class="cxp-acts"><button type="button" class="cxp-btn" data-act="no">Decline</button>' +
      '<button type="button" class="cxp-btn go" data-act="yes">Accept</button></div>';
    if (from.photo) {
      var img = document.createElement("img");
      img.alt = ""; img.referrerPolicy = "no-referrer";
      img.onerror = function () { img.remove(); card.querySelector(".cxp-av").textContent = letter; };
      img.src = from.photo;
      card.querySelector(".cxp-av").appendChild(img);
    }
    var btns = card.querySelectorAll(".cxp-btn");
    function respond(accept) {
      for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
      post("/api/chess/challenge/" + encodeURIComponent(c.id) + "/respond", { accept: accept }).then(function () {
        if (accept) { location.href = "/chess"; } else removeCard(c.id);
      }).catch(function (e) {
        removeCard(c.id);
        alert(e.message);
      });
    }
    card.querySelector('[data-act="no"]').addEventListener("click", function () { respond(false); });
    card.querySelector('[data-act="yes"]').addEventListener("click", function () { respond(true); });
    stack().appendChild(card);
    var left = c.expiresAt ? c.expiresAt - (Date.now() + offset) : 60000;
    setTimeout(function () { removeCard(c.id); }, Math.max(1000, left));
  }

  function connect() {
    clearTimeout(retryTimer);
    if (es) { es.close(); es = null; }
    es = new EventSource("/api/chess/stream");
    function on(name, fn) {
      es.addEventListener(name, function (e) {
        var d = null;
        try { d = JSON.parse(e.data); } catch (x) { return; }
        fn(d);
      });
    }
    on("hello", function (d) {
      retries = 0;
      opened = true;
      offset = (d.serverTime || Date.now()) - Date.now();
      (d.incoming || []).forEach(function (c) { incoming.push(c); showCard(c); });
      if (d.game && d.game.status === "active") location.href = "/chess";
    });
    on("challenge", function (c) { ping(); incoming.push(c); showCard(c); });
    on("challenge_update", function (u) { removeCard(u.id); });
    on("game_start", function () { location.href = "/chess"; });
    es.onerror = function () {
      /* A closed stream (not logged in, too many tabs) is final; otherwise the
         browser reconnects by itself, and we rebuild it if it gave up. */
      if (es && es.readyState === 2) {
        es = null;
        if (opened && ++retries <= 5) retryTimer = setTimeout(connect, Math.min(30000, 2000 * Math.pow(2, retries)));
      }
    };
  }

  function start() { connect(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.addEventListener("pagehide", function () { if (es) { es.close(); es = null; } });
})();
