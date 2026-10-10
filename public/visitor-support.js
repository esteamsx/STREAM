(function () {
  "use strict";
  if (window.EsVisitorSupport) return;

  var API = "/api/visitor-support";
  var LS_KEY = "es_vid";
  var overlay = null, bodyEl = null, inputEl = null, sendBtn = null, pollTimer = null;
  var reason = "vpn", sending = false, lastRenderKey = "";

  function getVid() { try { return localStorage.getItem(LS_KEY) || ""; } catch (e) { return ""; } }
  function setVid(v) { try { if (v) localStorage.setItem(LS_KEY, v); } catch (e) {} }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function timeAgo(ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return new Date(ts).toLocaleDateString();
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var vid = getVid();
    if (vid) opts.headers["x-visitor-id"] = vid;
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        return data;
      });
    });
  }

  function css() {
    if (document.getElementById("esVsCss")) return;
    var st = document.createElement("style");
    st.id = "esVsCss";
    st.textContent = [
      "#esVsOverlay{--accent:#00E0FF;--accent2:#7c5cff;--dark:#0A0A0F;--dark3:#13131C;--card2:#1B1B27;--border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);--text:#F3F3FA;--muted:rgba(255,255,255,.42);--ease:cubic-bezier(.4,0,.2,1);--font-display:'Space Grotesk',system-ui,sans-serif;",
      "position:fixed;inset:0;background:rgba(10,10,15,.75);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:2147483600;padding:24px;color:var(--text);font-family:Inter,-apple-system,system-ui,'Segoe UI',sans-serif}",
      "#esVsOverlay.show{display:flex}",
      "#esVsOverlay *{box-sizing:border-box}",
      "#esVsOverlay .flist-card{width:100%;max-width:400px;max-height:78vh;background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);display:flex;flex-direction:column;overflow:hidden}",
      "#esVsOverlay .flist-title{font-family:var(--font-display);font-weight:700;font-size:1.02rem}",
      "#esVsOverlay .flist-close{background:transparent;border:none;color:var(--muted);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .2s var(--ease)}",
      "#esVsOverlay .flist-close svg{width:18px;height:18px}",
      "#esVsOverlay .flist-close:active{transform:scale(.88)}",
      "#esVsOverlay .sc-chat-card{width:100%;max-width:420px;max-height:82vh;height:560px}",
      "#esVsOverlay .sc-brand-header{display:flex;align-items:center;gap:12px;padding:16px;flex-shrink:0;background:linear-gradient(120deg,var(--accent),var(--accent2));color:#04141a}",
      "#esVsOverlay .sc-brand-avatar{width:40px;height:40px;border-radius:50%;background:rgba(4,20,26,.14);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#04141a}",
      "#esVsOverlay .sc-brand-avatar svg{width:19px;height:19px}",
      "#esVsOverlay .sc-brand-info{flex:1;min-width:0}",
      "#esVsOverlay .sc-brand-info .flist-title{color:#04141a;display:flex;align-items:center;gap:4px}",
      "#esVsOverlay .sc-brand-header .flist-close{background:rgba(4,20,26,.14);color:#04141a}",
      "#esVsOverlay .sc-chat-subtitle{font-size:.72rem;color:rgba(4,20,26,.72);margin-top:2px}",
      "#esVsOverlay .sc-chat-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px;background-color:var(--dark);background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:18px 18px}",
      "#esVsOverlay .sc-bubble{position:relative;max-width:78%;padding:8px 12px;border-radius:14px;font-size:.84rem;line-height:1.4;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,.2)}",
      "#esVsOverlay .sc-bubble-me{align-self:flex-end;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;border-bottom-right-radius:4px}",
      "#esVsOverlay .sc-bubble-me::after{content:\"\";position:absolute;right:-6px;bottom:0;width:12px;height:12px;background:var(--accent2);clip-path:polygon(0 0,0% 100%,100% 100%)}",
      "#esVsOverlay .sc-bubble-them{align-self:flex-start;background:var(--card2);color:var(--text);border:1px solid var(--border-strong);border-bottom-left-radius:4px}",
      "#esVsOverlay .sc-bubble-them::after{content:\"\";position:absolute;left:-6px;bottom:-1px;width:12px;height:12px;background:var(--card2);border-left:1px solid var(--border-strong);border-bottom:1px solid var(--border-strong);clip-path:polygon(100% 0,0% 100%,100% 100%)}",
      "#esVsOverlay .sc-bubble-time{font-size:.63rem;opacity:.7;margin-top:3px;display:flex;align-items:center;gap:5px}",
      "#esVsOverlay .sc-seen-tag{display:inline-flex;align-items:center;gap:2px;font-weight:600}",
      "#esVsOverlay .sc-seen-tag svg{width:11px;height:11px}",
      "#esVsOverlay .sc-chat-empty{margin:auto;color:var(--muted);font-size:.83rem;text-align:center;padding:0 10px;line-height:1.5}",
      "#esVsOverlay .sc-msg-row{display:flex;flex-direction:column}",
      "#esVsOverlay .sc-msg-row.sc-row-me{align-items:flex-end}",
      "#esVsOverlay .sc-msg-row.sc-row-them{align-items:flex-start}",
      "#esVsOverlay .sc-chat-footer{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--border);flex-shrink:0}",
      "#esVsOverlay .sc-chat-input{flex:1;background:var(--dark3);border:1px solid var(--border-strong);border-radius:20px;padding:10px 15px;color:var(--text);font-size:.85rem;font-family:inherit;resize:none;max-height:120px;overflow-y:auto;line-height:1.4;outline:none}",
      "#esVsOverlay .sc-chat-send{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .2s var(--ease),transform .15s var(--ease)}",
      "#esVsOverlay .sc-chat-send:disabled{opacity:.4;cursor:default}",
      "#esVsOverlay .sc-chat-send:active:not(:disabled){transform:scale(.9)}",
      "#esVsOverlay .sc-chat-send svg{width:16px;height:16px;transform:translateX(-1px)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function build() {
    if (overlay) return;
    css();
    overlay = document.createElement("div");
    overlay.id = "esVsOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Customer Support");
    overlay.innerHTML =
      '<div class="flist-card sc-chat-card">' +
        '<div class="sc-brand-header">' +
          '<div class="sc-brand-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0116 0v1"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/><path d="M20 20a4 4 0 01-4 4h-2"/></svg></div>' +
          '<div class="sc-brand-info"><div class="flist-title">Customer Support</div><div class="sc-chat-subtitle">We\'re here to help</div></div>' +
          '<button type="button" class="flist-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
        '<div class="sc-chat-body"></div>' +
        '<div class="sc-chat-footer">' +
          '<textarea class="sc-chat-input" maxlength="2000" rows="1" placeholder="Type a message\u2026" autocomplete="off"></textarea>' +
          '<button type="button" class="sc-chat-send" aria-label="Send" disabled><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
        '</div>' +
      '</div>';
    document.documentElement.appendChild(overlay);

    bodyEl = overlay.querySelector(".sc-chat-body");
    inputEl = overlay.querySelector(".sc-chat-input");
    sendBtn = overlay.querySelector(".sc-chat-send");

    overlay.querySelector(".flist-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    inputEl.addEventListener("input", function () {
      inputEl.style.height = "auto";
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
      sendBtn.disabled = sending || !inputEl.value.trim();
    });
    sendBtn.addEventListener("click", send);
  }

  function render(messages) {
    var key = messages.map(function (m) { return m.id + ":" + (m.seenByAdmin ? 1 : 0); }).join("|");
    if (key === lastRenderKey) return;
    lastRenderKey = key;
    var nearBottom = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 80;
    if (!messages.length) {
      bodyEl.innerHTML = '<div class="sc-chat-empty">Tell us what happened and we will reply right here.<br>Please keep this page open.</div>';
      return;
    }
    bodyEl.innerHTML = messages.map(function (m) {
      var mine = !m.fromAdmin;
      return '<div class="sc-msg-row ' + (mine ? "sc-row-me" : "sc-row-them") + '">' +
        '<div class="sc-bubble ' + (mine ? "sc-bubble-me" : "sc-bubble-them") + '">' +
          esc(m.text) +
          '<span class="sc-bubble-time">' + timeAgo(m.createdAt) +
          (mine && m.seenByAdmin ? '<span class="sc-seen-tag">' + CHECK + "Seen</span>" : "") +
          "</span></div></div>";
    }).join("");
    if (nearBottom || messages.length) bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function load() {
    return api("/messages").then(function (d) {
      if (d.visitorId) setVid(d.visitorId);
      render(d.messages || []);
    }).catch(function () {});
  }

  function send() {
    var text = inputEl.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    api("/messages", { method: "POST", body: JSON.stringify({ text: text, reason: reason }) })
      .then(function (d) {
        if (d.visitorId) setVid(d.visitorId);
        inputEl.value = "";
        inputEl.style.height = "auto";
        return load();
      })
      .catch(function (err) {
        var note = document.createElement("div");
        note.className = "sc-chat-empty";
        note.textContent = err.message;
        bodyEl.appendChild(note);
        bodyEl.scrollTop = bodyEl.scrollHeight;
        setTimeout(function () { note.remove(); }, 4000);
      })
      .then(function () { sending = false; sendBtn.disabled = !inputEl.value.trim(); });
  }

  function open(why) {
    reason = why === "private" ? "private" : "vpn";
    build();
    overlay.classList.add("show");
    lastRenderKey = "";
    load();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { if (!document.hidden) load(); }, 4000);
    setTimeout(function () { try { inputEl.focus(); } catch (e) {} }, 50);
  }

  function close() {
    if (overlay) overlay.classList.remove("show");
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  window.EsVisitorSupport = { open: open, close: close };
})();
