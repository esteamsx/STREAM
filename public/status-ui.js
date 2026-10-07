(function () {
  "use strict";
  if (window.EsStatus) return;

  var BGS = ["#128C7E", "#7c5cff", "#FF3B5C", "#0B84FF", "#E5890A", "#2E7D32", "#8E24AA", "#37474F"];
  var IMG_LIMIT_CHARS = 880000;
  var SLIDE_MS = 5000;
  var GREEN = "#25D366";

  var GLASS_DARK = "linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06)";
  var GLASS_LIGHT = "linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%)";

  var CSS = [
    ".st-ring{box-shadow:0 0 0 2px var(--dark,#0A0A0F),0 0 0 4.5px " + GREEN + " !important;cursor:pointer}",
    ".st-ring.seen{box-shadow:0 0 0 2px var(--dark,#0A0A0F),0 0 0 4.5px rgba(150,150,160,.55) !important}",
    /* edge arrow (same look as the account rewards slider, with a glow) */
    ".st-hint{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:250;background:var(--card,#15151F);border:1px solid var(--border-strong,rgba(255,255,255,.13));border-right:none;border-radius:12px 0 0 12px;padding:12px 8px;color:var(--accent,#00E0FF);display:flex;align-items:center;cursor:pointer;box-shadow:-4px 0 18px rgba(0,224,255,.22)}",
    ".st-hint svg{width:16px;height:16px;animation:stHint 1.8s ease-in-out infinite;filter:drop-shadow(0 0 4px rgba(0,224,255,.7))}",
    "@keyframes stHint{0%,100%{transform:translateX(0);opacity:.55}50%{transform:translateX(-3px);opacity:1}}",
    ".st-hint .st-dot{position:absolute;top:6px;left:5px;width:8px;height:8px;border-radius:50%;background:" + GREEN + ";display:none}",
    ".st-hint.has-new .st-dot{display:block}",
    /* site overlay: translucent blurred backdrop + glass card */
    ".st-ov{position:fixed;inset:0;background:rgba(10,10,15,.75);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:9300;padding:24px;font-family:var(--font-body,Inter,-apple-system,sans-serif)}",
    ".st-ov.show{display:flex}",
    ".st-ov.st-over{z-index:9400}",
    ".st-ov.st-top{z-index:9500}",
    ".st-ov.st-sheet-ov{align-items:flex-end;padding:0}",
    ".st-glass{width:100%;max-width:400px;background:" + GLASS_DARK + ";border:1px solid rgba(255,255,255,.22);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);display:flex;flex-direction:column;overflow:hidden;color:var(--text,#F3F3FA)}",
    ":root[data-theme=\"light\"] .st-glass{background:" + GLASS_LIGHT + ";border:1px solid rgba(255,255,255,.65);box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7)}",
    ".st-ov.show .st-glass{animation:stIn .35s var(--ease,cubic-bezier(.22,1,.36,1))}",
    "@keyframes stIn{from{transform:translateX(36px);opacity:0}to{transform:none;opacity:1}}",
    ".st-ov.st-sheet-ov .st-glass{max-width:440px;max-height:72vh;border-radius:20px 20px 0 0;animation:stUp .3s var(--ease,cubic-bezier(.22,1,.36,1))}",
    "@keyframes stUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}",
    ".st-panel-card{height:640px;max-height:84vh}",
    ".st-hd{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 8px}",
    ".st-title{font-family:var(--font-display,'Space Grotesk',Inter,sans-serif);font-weight:700;font-size:1.02rem}",
    ".st-x{background:transparent;border:none;color:var(--muted,rgba(255,255,255,.42));width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .2s var(--ease,ease)}",
    ".st-x:hover{color:var(--accent,#00E0FF);background:rgba(0,224,255,.1)}",
    ".st-x svg{width:18px;height:18px}",
    ".st-list{overflow-y:auto;padding:0 10px 10px;flex:1;min-height:0}",
    ".st-label{padding:14px 8px 6px;font-size:.66rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,rgba(255,255,255,.42))}",
    ".st-row{display:flex;align-items:center;gap:12px;padding:9px 8px;border-radius:10px;cursor:pointer;width:100%;background:none;border:0;color:inherit;text-align:left;font:inherit;transition:background .2s var(--ease,ease)}",
    ".st-row:hover{background:rgba(0,224,255,.08)}",
    ".st-av{position:relative;width:46px;height:46px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent,#00E0FF),var(--accent2,#7c5cff));background-size:cover;background-position:center;color:#04141a;font-family:var(--font-display,'Space Grotesk',Inter,sans-serif);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.95rem}",
    ".st-av.sm{width:38px;height:38px;font-size:.85rem}",
    ".st-av-plus{position:absolute;right:-3px;bottom:-3px;width:20px;height:20px;border-radius:50%;background:" + GREEN + ";color:#fff;border:2px solid var(--dark,#0A0A0F);display:flex;align-items:center;justify-content:center}",
    ".st-av-plus svg{width:11px;height:11px}",
    ".st-info{flex:1;min-width:0}",
    ".st-name{font-size:.85rem;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".st-sub{font-size:.74rem;color:var(--muted,rgba(255,255,255,.42));margin-top:2px}",
    ".st-empty{padding:26px 14px;text-align:center;color:var(--muted,rgba(255,255,255,.42));font-size:.84rem;line-height:1.5}",
    ".st-actions{display:flex;gap:10px;padding:12px 18px 18px;border-top:1px solid var(--border,rgba(255,255,255,.07))}",
    ".st-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.85rem;font-family:inherit;cursor:pointer;background:linear-gradient(135deg,var(--accent,#00E0FF),var(--accent2,#7c5cff));color:#04141a}",
    ".st-btn.ghost{background:rgba(255,255,255,.06);border:1px solid var(--border-strong,rgba(255,255,255,.13));color:var(--text,#F3F3FA)}",
    ".st-btn:disabled{opacity:.55}",
    ".st-btn svg{width:18px;height:18px}",
    ".st-in{width:100%;background:var(--dark3,#13131C);border:1px solid var(--border-strong,rgba(255,255,255,.13));border-radius:22px;padding:11px 16px;color:var(--text,#F3F3FA);font-size:.88rem;font-family:inherit;outline:0}",
    ".st-in:focus{border-color:var(--accent,#00E0FF)}",
    ".st-body{padding:4px 18px 18px;display:flex;flex-direction:column;gap:14px}",
    ".st-prev{min-height:210px;border-radius:14px;display:flex;align-items:center;justify-content:center;padding:18px;border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}",
    ".st-prev textarea{width:100%;max-height:40vh;background:none;border:0;outline:0;resize:none;color:#fff;text-align:center;font-size:1.35rem;font-weight:600;font-family:var(--font-display,'Space Grotesk',Inter,sans-serif);line-height:1.3}",
    ".st-prev textarea::placeholder{color:rgba(255,255,255,.7)}",
    ".st-prev img{max-width:100%;max-height:44vh;border-radius:10px;object-fit:contain}",
    ".st-swatches{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}",
    ".st-sw{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}",
    ".st-sw.on{border-color:var(--text,#F3F3FA);box-shadow:0 0 0 2px rgba(0,224,255,.45)}",
    /* story viewer (glass frame on the blurred site backdrop) */
    ".st-ov.st-viewer-ov{padding:12px;background:rgba(10,10,15,.82)}",
    ".st-story{position:relative;width:100%;max-width:420px;height:min(88vh,780px);border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.22);box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);background:rgba(0,0,0,.4);color:#fff}",
    ".st-bars{position:absolute;top:0;left:0;right:0;display:flex;gap:4px;padding:10px 10px 0;z-index:3}",
    ".st-bar{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}",
    ".st-bar i{display:block;height:100%;width:0;background:#fff}",
    ".st-vhead{position:absolute;top:10px;left:0;right:0;display:flex;align-items:center;gap:10px;padding:10px 12px;z-index:3;background:linear-gradient(rgba(0,0,0,.55),transparent)}",
    ".st-vhead .meta{flex:1;min-width:0}",
    ".st-vhead .nm{font-weight:600;font-size:.88rem}",
    ".st-vhead .tm{font-size:.72rem;opacity:.85}",
    ".st-vhead .st-x{color:#fff}",
    ".st-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}",
    ".st-stage img{max-width:100%;max-height:100%;object-fit:contain}",
    ".st-stage .txt{padding:90px 26px;text-align:center;font-family:var(--font-display,'Space Grotesk',Inter,sans-serif);font-size:1.6rem;font-weight:600;line-height:1.3;white-space:pre-wrap;word-break:break-word;max-width:100%}",
    ".st-cap{position:absolute;left:0;right:0;bottom:70px;text-align:center;padding:26px 18px 12px;background:linear-gradient(transparent,rgba(0,0,0,.65));font-size:.95rem;white-space:pre-wrap;word-break:break-word;z-index:2}",
    ".st-tap{position:absolute;top:84px;bottom:84px;z-index:1}",
    ".st-tap.l{left:0;width:35%}.st-tap.r{right:0;width:65%}",
    ".st-vfoot{position:absolute;left:0;right:0;bottom:0;z-index:3;background:linear-gradient(transparent,rgba(0,0,0,.5))}",
    ".st-send-bar{display:flex;align-items:center;gap:10px;padding:10px 14px 14px}",
    ".st-send-bar .st-in{background:rgba(0,0,0,.4);border-color:rgba(255,255,255,.22);color:#fff}",
    ".st-send-bar .st-in::placeholder{color:rgba(255,255,255,.65)}",
    ".st-send{width:42px;height:42px;border-radius:50%;border:0;flex-shrink:0;background:linear-gradient(135deg,var(--accent,#00E0FF),var(--accent2,#7c5cff));color:#04141a;display:flex;align-items:center;justify-content:center;cursor:pointer}",
    ".st-send:disabled{opacity:.5}",
    ".st-send svg{width:18px;height:18px}",
    ".st-views-btn{display:flex;align-items:center;gap:8px;margin:0 auto;padding:14px 20px 16px;background:none;border:0;color:#fff;font-size:.85rem;font-weight:600;font-family:inherit;cursor:pointer}",
    ".st-views-btn svg{width:18px;height:18px}",
    ".st-tabs{display:flex;border-bottom:1px solid var(--border,rgba(255,255,255,.07))}",
    ".st-tab{flex:1;padding:14px;background:none;border:0;border-bottom:2px solid transparent;color:var(--muted,rgba(255,255,255,.42));font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit}",
    ".st-tab.on{color:var(--text,#F3F3FA);border-bottom-color:var(--accent,#00E0FF)}",
    ".st-cmt{font-size:.84rem;margin-top:3px;white-space:pre-wrap;word-break:break-word}",
    ".st-confirm{padding:22px 20px;text-align:center}",
    ".st-confirm p{font-size:.9rem;margin-bottom:16px}",
    ".st-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9700;background:var(--card2,#1B1B27);border:1px solid var(--border-strong,rgba(255,255,255,.13));border-radius:12px;padding:11px 16px;font-size:.82rem;color:var(--text,#F3F3FA);box-shadow:0 12px 32px rgba(0,0,0,.5);max-width:88vw;text-align:center;font-family:var(--font-body,Inter,sans-serif)}"
  ].join("\n");

  var ICONS = {
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linejoin="round" d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor"/></svg>'
  };

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k === "style") el.style.cssText = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }

  function api(url, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: "same-origin", headers: {} };
    if (opts.body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.body); }
    return fetch(url, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || "Request failed");
        return d;
      });
    });
  }

  function toast(msg) {
    var t = h("div", { class: "st-toast", text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var hr = Math.floor(m / 60);
    if (hr < 24) return hr + (hr === 1 ? " hour ago" : " hours ago");
    return "yesterday";
  }

  function nameOf(u) {
    return ((u.firstName || "") + " " + (u.lastName || "")).trim() || (u.username ? "@" + u.username : "User");
  }

  function paint(el, u) {
    if (u.photoURL) { el.style.backgroundImage = 'url("' + u.photoURL + '")'; el.textContent = ""; }
    else el.textContent = ((u.firstName || "")[0] || (u.username || "?")[0] || "?").toUpperCase();
  }

  function bgCss(c) {
    return "linear-gradient(155deg,rgba(255,255,255,.2),rgba(0,0,0,.3)),#" + String(c).replace("#", "");
  }

  function overlay(extraCls) {
    var ov = h("div", { class: "st-ov show " + (extraCls || "") });
    return ov;
  }

  function confirmBox(msg) {
    return new Promise(function (resolve) {
      var ov = overlay("st-top");
      var yes = h("button", { class: "st-btn", type: "button", text: "Delete" });
      var no = h("button", { class: "st-btn ghost", type: "button", text: "Cancel" });
      function done(v) { ov.remove(); resolve(v); }
      yes.addEventListener("click", function () { done(true); });
      no.addEventListener("click", function () { done(false); });
      ov.addEventListener("click", function (e) { if (e.target === ov) done(false); });
      var box = h("div", { class: "st-glass", style: "max-width:320px" }, [
        h("div", { class: "st-confirm" }, [h("p", { text: msg }), h("div", { style: "display:flex;gap:10px" }, [no, yes])])
      ]);
      ov.appendChild(box);
      document.body.appendChild(ov);
    });
  }

  function avatar(u, small) {
    var a = h("div", { class: "st-av" + (small ? " sm" : "") });
    paint(a, u);
    return a;
  }

  var style = h("style", { text: CSS });
  style.setAttribute("data-es-status", "1");
  document.head.appendChild(style);

  var state = { feed: null, panel: null, hint: null, list: null, timers: [] };

  function anyOverlayOpen() {
    return !!document.querySelector(".page-overlay.show,.pm-overlay.show,.tr-overlay.show,.st-ov.show");
  }

  /* ---------- Rings ---------- */
  function ring(avatarEl, uid, clickEl) {
    if (!avatarEl || !uid) return;
    clickEl = clickEl || avatarEl;
    api("/api/status/summary/" + encodeURIComponent(uid)).then(function (s) {
      avatarEl.classList.remove("st-ring", "seen");
      if (!s.count) {
        if (clickEl._stH) { clickEl.removeEventListener("click", clickEl._stH, true); clickEl._stH = null; }
        return;
      }
      avatarEl.classList.add("st-ring");
      if (s.allSeen) avatarEl.classList.add("seen");
      if (!clickEl._stH) {
        clickEl._stH = function (e) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          openUser(uid);
        };
        clickEl.addEventListener("click", clickEl._stH, true);
      }
    }).catch(function () {});
  }

  function refreshRings() {
    var selfEls = document.querySelectorAll("[data-st-self]");
    if (!selfEls.length) return;
    api("/api/status/feed").then(function (f) {
      selfEls.forEach(function (el) { ring(el, f.meUid); });
    }).catch(function () {});
  }

  /* ---------- Panel (WhatsApp "Updates" style list, site glass design) ---------- */
  function loadFeed() {
    return api("/api/status/feed").then(function (f) {
      state.feed = f;
      if (state.hint) state.hint.classList.toggle("has-new", f.users.some(function (u) { return !u.allSeen; }));
      return f;
    });
  }

  function infoBlock(name, sub) {
    return h("div", { class: "st-info" }, [h("div", { class: "st-name", text: name }), h("div", { class: "st-sub", text: sub })]);
  }

  function renderList() {
    var f = state.feed;
    var body = state.list;
    body.textContent = "";
    var myAv = h("div", { class: "st-av" });
    paint(myAv, state.me || {});
    myAv.appendChild(h("span", { class: "st-av-plus", html: ICONS.plus }));
    if (f && f.mine) myAv.classList.add("st-ring", "seen");
    var myRow = h("button", { class: "st-row", type: "button" }, [
      myAv,
      infoBlock("My status", f && f.mine ? f.mine.count + (f.mine.count === 1 ? " update" : " updates") + " \u00b7 " + ago(f.mine.latestAt) : "Tap to add status update")
    ]);
    myRow.addEventListener("click", function () {
      if (f && f.mine) openUser(f.meUid); else openTextComposer();
    });
    body.appendChild(myRow);

    var unseen = (f ? f.users : []).filter(function (u) { return !u.allSeen; });
    var seen = (f ? f.users : []).filter(function (u) { return u.allSeen; });
    function section(title, arr, isSeen) {
      if (!arr.length) return;
      body.appendChild(h("div", { class: "st-label", text: title }));
      arr.forEach(function (e) {
        var av = avatar(e.user);
        av.classList.add("st-ring");
        if (isSeen) av.classList.add("seen");
        var row = h("button", { class: "st-row", type: "button" }, [av, infoBlock(nameOf(e.user), e.count + (e.count === 1 ? " update" : " updates") + " \u00b7 " + ago(e.latestAt))]);
        row.addEventListener("click", function () { openUser(e.uid); });
        body.appendChild(row);
      });
    }
    section("Recent updates", unseen, false);
    section("Viewed updates", seen, true);
    if (!unseen.length && !seen.length) {
      body.appendChild(h("div", { class: "st-empty", text: "No updates from other people yet. Updates disappear after 24 hours." }));
    }
  }

  function openPanel() {
    if (!state.panel) return;
    state.panel.classList.add("show");
    document.documentElement.style.overflow = "hidden";
    loadFeed().then(renderList).catch(function () {
      state.list.textContent = "";
      state.list.appendChild(h("div", { class: "st-empty", text: "Log in to see status updates." }));
    });
  }

  function closePanel() {
    if (!state.panel) return;
    state.panel.classList.remove("show");
    document.documentElement.style.overflow = "";
  }

  function panelOpen() { return !!(state.panel && state.panel.classList.contains("show")); }

  function init(opts) {
    opts = opts || {};
    if (state.panel) return;
    state.me = opts.me || null;
    if (!state.me) {
      api("/api/profile").then(function (p) {
        state.me = p;
        if (panelOpen() && state.feed) renderList();
      }).catch(function () {});
    }
    var hint = h("button", { class: "st-hint", type: "button", "aria-label": "Swipe for Status", html: ICONS.chev });
    hint.appendChild(h("span", { class: "st-dot" }));
    hint.addEventListener("click", openPanel);
    document.body.appendChild(hint);
    state.hint = hint;

    var closeBtn = h("button", { class: "st-x", type: "button", "aria-label": "Close", html: ICONS.close });
    closeBtn.addEventListener("click", closePanel);
    var list = h("div", { class: "st-list" });
    var bText = h("button", { class: "st-btn ghost", type: "button", html: ICONS.pen });
    bText.appendChild(document.createTextNode("Text"));
    var bPhoto = h("button", { class: "st-btn", type: "button", html: ICONS.cam });
    bPhoto.appendChild(document.createTextNode("Photo"));
    bText.addEventListener("click", openTextComposer);
    bPhoto.addEventListener("click", openPhotoPicker);
    var card = h("div", { class: "st-glass st-panel-card", role: "dialog", "aria-label": "Status" }, [
      h("div", { class: "st-hd" }, [h("div", { class: "st-title", text: "Status" }), closeBtn]),
      list,
      h("div", { class: "st-actions" }, [bText, bPhoto])
    ]);
    var panel = h("div", { class: "st-ov" }, [card]);
    panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); });
    document.body.appendChild(panel);
    state.panel = panel;
    state.list = list;

    var sx = 0, sy = 0, tracking = false;
    document.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (!panelOpen() && dx < 0 && !anyOverlayOpen()) {
        var t = e.target;
        if (t && t.closest && t.closest("input,textarea,select,[contenteditable]")) return;
        openPanel();
      } else if (panelOpen() && dx > 0 && !document.querySelector(".st-over.show")) {
        closePanel();
      }
    }, { passive: true });

    loadFeed().catch(function () {});
  }

  /* ---------- Composers ---------- */
  function openTextComposer() {
    var idx = Math.floor(Math.random() * BGS.length);
    var ta = h("textarea", { maxlength: "700", rows: "4", placeholder: "Type a status" });
    var prev = h("div", { class: "st-prev", style: "background:" + bgCss(BGS[idx]) }, [ta]);
    var ov = overlay("st-over");
    var close = h("button", { class: "st-x", type: "button", "aria-label": "Close", html: ICONS.close });
    var post = h("button", { class: "st-btn", type: "button", text: "Post status" });
    var swatches = h("div", { class: "st-swatches" });
    BGS.forEach(function (c, i) {
      var sw = h("button", { class: "st-sw" + (i === idx ? " on" : ""), type: "button", "aria-label": "Color " + (i + 1), style: "background:" + bgCss(c) });
      sw.addEventListener("click", function () {
        idx = i;
        prev.style.background = bgCss(BGS[idx]);
        Array.prototype.forEach.call(swatches.children, function (n, k) { n.classList.toggle("on", k === idx); });
      });
      swatches.appendChild(sw);
    });
    close.addEventListener("click", function () { ov.remove(); });
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    post.addEventListener("click", function () {
      var text = ta.value.trim();
      if (!text) { toast("Write something first."); return; }
      post.disabled = true;
      api("/api/status", { method: "POST", body: { type: "text", text: text, bg: BGS[idx] } }).then(function () {
        ov.remove(); toast("Status posted"); afterPost();
      }).catch(function (err) { post.disabled = false; toast(err.message); });
    });
    ov.appendChild(h("div", { class: "st-glass" }, [
      h("div", { class: "st-hd" }, [h("div", { class: "st-title", text: "Text status" }), close]),
      h("div", { class: "st-body" }, [prev, swatches, post])
    ]));
    document.body.appendChild(ov);
    setTimeout(function () { ta.focus(); }, 80);
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
        reject(new Error("Only photos (JPG, PNG, WebP) are allowed. Videos are not supported yet."));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1280, q = 0.85, out = "";
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        for (var i = 0; i < 6; i++) {
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL("image/jpeg", q);
          if (out.length <= IMG_LIMIT_CHARS) break;
          q = Math.max(0.5, q - 0.1);
          scale *= 0.85;
        }
        URL.revokeObjectURL(url);
        if (out.length > IMG_LIMIT_CHARS) reject(new Error("That photo is too large. Try a smaller one."));
        else resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read that photo.")); };
      img.src = url;
    });
  }

  function openPhotoPicker() {
    var input = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none" });
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      fileToDataUrl(f).then(openPhotoComposer).catch(function (err) { toast(err.message); });
    });
    document.body.appendChild(input);
    input.click();
  }

  function openPhotoComposer(dataUrl) {
    var ov = overlay("st-over");
    var close = h("button", { class: "st-x", type: "button", "aria-label": "Close", html: ICONS.close });
    var cap = h("input", { class: "st-in", type: "text", maxlength: "300", placeholder: "Add a caption..." });
    var post = h("button", { class: "st-btn", type: "button", text: "Post status" });
    close.addEventListener("click", function () { ov.remove(); });
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    post.addEventListener("click", function () {
      post.disabled = true;
      api("/api/status", { method: "POST", body: { type: "image", imageDataUrl: dataUrl, caption: cap.value.trim() } }).then(function () {
        ov.remove(); toast("Status posted"); afterPost();
      }).catch(function (err) { post.disabled = false; toast(err.message); });
    });
    var img = h("img", { alt: "Status preview" });
    img.src = dataUrl;
    ov.appendChild(h("div", { class: "st-glass" }, [
      h("div", { class: "st-hd" }, [h("div", { class: "st-title", text: "Photo status" }), close]),
      h("div", { class: "st-body" }, [h("div", { class: "st-prev", style: "background:rgba(0,0,0,.25);padding:10px" }, [img]), cap, post])
    ]));
    document.body.appendChild(ov);
  }

  function afterPost() {
    loadFeed().then(function () { if (panelOpen()) renderList(); }).catch(function () {});
    refreshRings();
    window.dispatchEvent(new CustomEvent("es-status-changed"));
  }

  /* ---------- Viewer ---------- */
  function openUser(uid) {
    api("/api/status/user/" + encodeURIComponent(uid)).then(function (d) {
      var start = 0;
      if (!d.isOwner) {
        var firstUnseen = d.statuses.findIndex(function (s) { return !s.seen; });
        start = firstUnseen < 0 ? 0 : firstUnseen;
      }
      playViewer(d, start);
    }).catch(function (err) { toast(err.message || "No status to show."); });
  }

  function playViewer(d, startIndex) {
    var statuses = d.statuses, idx = startIndex, elapsed = 0, paused = false, timer = null, duration = SLIDE_MS;
    var ov = overlay("st-over st-viewer-ov");
    var story = h("div", { class: "st-story" });
    var stage = h("div", { class: "st-stage" });
    var barsEl = h("div", { class: "st-bars" });
    var bars = statuses.map(function () { var i = h("i"); barsEl.appendChild(h("div", { class: "st-bar" }, [i])); return i; });
    var nm = h("div", { class: "nm" }), tm = h("div", { class: "tm" });
    var av = avatar(d.user, true);
    var closeBtn = h("button", { class: "st-x", type: "button", "aria-label": "Close", html: ICONS.close });
    var head = h("div", { class: "st-vhead" }, [av, h("div", { class: "meta" }, [nm, tm])]);
    if (d.isOwner) {
      var del = h("button", { class: "st-x", type: "button", "aria-label": "Delete status", html: ICONS.trash });
      del.addEventListener("click", function () {
        paused = true;
        confirmBox("Delete this status update?").then(function (ok) {
          if (!ok) { paused = false; return; }
          api("/api/status/" + statuses[idx].id, { method: "DELETE" }).then(function () {
            statuses.splice(idx, 1);
            if (!statuses.length) { finish(); afterPost(); return; }
            bars.pop().parentNode.remove();
            if (idx >= statuses.length) idx = statuses.length - 1;
            paused = false; show(idx); afterPost();
          }).catch(function (err) { paused = false; toast(err.message); });
        });
      });
      head.appendChild(del);
    }
    head.appendChild(closeBtn);
    var left = h("div", { class: "st-tap l" }), right = h("div", { class: "st-tap r" });
    var foot = h("div", { class: "st-vfoot" });
    story.appendChild(stage);
    story.appendChild(barsEl);
    story.appendChild(head);
    story.appendChild(left);
    story.appendChild(right);
    story.appendChild(foot);
    ov.appendChild(story);

    function finish() {
      clearInterval(timer);
      document.removeEventListener("keydown", onKey);
      ov.remove();
      loadFeed().then(function () { if (panelOpen()) renderList(); }).catch(function () {});
      refreshRings();
    }
    function onKey(e) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    function next() { if (idx < statuses.length - 1) show(idx + 1); else finish(); }
    function prev() { if (idx > 0) show(idx - 1); else show(0); }

    function show(i) {
      idx = i; elapsed = 0;
      var s = statuses[i];
      stage.textContent = "";
      stage.style.background = "transparent";
      foot.textContent = "";
      if (s.type === "image") {
        var im = h("img", { alt: "" });
        im.src = s.imageDataUrl;
        stage.appendChild(im);
        if (s.caption) story.appendChild(h("div", { class: "st-cap", "data-cap": "1", text: s.caption }));
        duration = SLIDE_MS;
      } else {
        stage.style.background = bgCss(s.bg);
        stage.appendChild(h("div", { class: "txt", text: s.text }));
        duration = Math.min(12000, SLIDE_MS + Math.max(0, s.text.length - 60) * 40);
      }
      var oldCap = story.querySelectorAll("[data-cap]");
      Array.prototype.forEach.call(oldCap, function (c, n) { if (n < oldCap.length - (s.type === "image" && s.caption ? 1 : 0)) c.remove(); });
      bars.forEach(function (b, n) { b.style.width = n < i ? "100%" : "0"; });
      nm.textContent = d.isOwner ? "My status" : nameOf(d.user);
      tm.textContent = ago(s.createdAt);
      if (d.isOwner) buildOwnerFoot(s); else buildViewerFoot(s);
      if (!d.isOwner && !s.seen) {
        s.seen = true;
        api("/api/status/" + s.id + "/view", { method: "POST" }).catch(function () {});
      }
    }

    function buildViewerFoot(s) {
      var input = h("input", { class: "st-in", type: "text", maxlength: "300", placeholder: "Comment on this status..." });
      var send = h("button", { class: "st-send", type: "button", "aria-label": "Send comment", html: ICONS.send });
      input.addEventListener("focus", function () { paused = true; });
      input.addEventListener("blur", function () { paused = false; });
      function go() {
        var text = input.value.trim();
        if (!text) return;
        send.disabled = true;
        api("/api/status/" + s.id + "/comments", { method: "POST", body: { text: text } }).then(function () {
          input.value = ""; input.blur(); toast("Comment sent");
        }).catch(function (err) { toast(err.message); }).then(function () { send.disabled = false; });
      }
      send.addEventListener("click", go);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      foot.appendChild(h("div", { class: "st-send-bar" }, [input, send]));
    }

    function buildOwnerFoot(s) {
      var btn = h("button", { class: "st-views-btn", type: "button", html: ICONS.eye });
      btn.appendChild(document.createTextNode(" " + (s.viewCount || 0) + " " + ((s.viewCount || 0) === 1 ? "view" : "views") + " \u00b7 " + (s.commentCount || 0) + " " + ((s.commentCount || 0) === 1 ? "comment" : "comments")));
      btn.addEventListener("click", function () { openSheet(s); });
      foot.appendChild(btn);
    }

    function openSheet(s) {
      paused = true;
      var sw = overlay("st-top st-sheet-ov");
      var tViews = h("button", { class: "st-tab on", type: "button", text: "Views" });
      var tCmts = h("button", { class: "st-tab", type: "button", text: "Comments" });
      var list = h("div", { class: "st-list", style: "padding-top:6px" }, [h("div", { class: "st-empty", text: "Loading..." })]);
      sw.appendChild(h("div", { class: "st-glass" }, [h("div", { class: "st-tabs" }, [tViews, tCmts]), list]));
      document.body.appendChild(sw);
      var data = null, tab = "views";
      function close() { sw.remove(); paused = false; }
      sw.addEventListener("click", function (e) { if (e.target === sw) close(); });
      function render() {
        list.textContent = "";
        tViews.classList.toggle("on", tab === "views");
        tCmts.classList.toggle("on", tab === "comments");
        if (!data) return;
        tViews.textContent = "Views (" + data.views.length + ")";
        tCmts.textContent = "Comments (" + data.comments.length + ")";
        var rows = tab === "views" ? data.views : data.comments;
        if (!rows.length) {
          list.appendChild(h("div", { class: "st-empty", text: tab === "views" ? "No views yet." : "No comments yet." }));
          return;
        }
        rows.forEach(function (r) {
          var info = h("div", { class: "st-info" }, [h("div", { class: "st-name", text: nameOf(r.user) })]);
          if (tab === "views") info.appendChild(h("div", { class: "st-sub", text: ago(r.viewedAt) }));
          else {
            info.appendChild(h("div", { class: "st-cmt", text: r.text }));
            info.appendChild(h("div", { class: "st-sub", text: ago(r.createdAt) }));
          }
          list.appendChild(h("div", { class: "st-row", style: "cursor:default;align-items:flex-start" }, [avatar(r.user, true), info]));
        });
      }
      tViews.addEventListener("click", function () { tab = "views"; render(); });
      tCmts.addEventListener("click", function () { tab = "comments"; render(); });
      api("/api/status/" + s.id + "/details").then(function (r) { data = r; render(); }).catch(function (err) {
        list.textContent = "";
        list.appendChild(h("div", { class: "st-empty", text: err.message }));
      });
    }

    right.addEventListener("click", next);
    left.addEventListener("click", prev);
    closeBtn.addEventListener("click", finish);
    ov.addEventListener("click", function (e) { if (e.target === ov) finish(); });
    [left, right].forEach(function (z) {
      z.addEventListener("pointerdown", function () { paused = true; });
      z.addEventListener("pointerup", function () { paused = false; });
      z.addEventListener("pointerleave", function () { paused = false; });
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    show(idx);
    timer = setInterval(function () {
      if (paused || document.hidden) return;
      elapsed += 50;
      bars[idx].style.width = Math.min(100, (elapsed / duration) * 100) + "%";
      if (elapsed >= duration) next();
    }, 50);
  }

  function openMine() {
    api("/api/status/feed").then(function (f) { openUser(f.meUid); }).catch(function () {});
  }

  window.EsStatus = { init: init, ring: ring, refreshRings: refreshRings, openPanel: openPanel, openUser: openUser, openMine: openMine };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshRings);
  else refreshRings();
})();
