const STYLE_ID = "esPermissionGateStyles";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .es-perm-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(3,7,20,.72);backdrop-filter:blur(12px);opacity:0;transition:opacity .2s ease}
    .es-perm-backdrop.es-perm-show{opacity:1}
    .es-perm-card{position:relative;width:min(430px,100%);overflow:hidden;border:1px solid rgba(125,110,255,.38);border-radius:24px;padding:28px;color:#f7f8ff;background:linear-gradient(145deg,rgba(21,27,63,.97),rgba(14,17,42,.97));box-shadow:0 24px 90px rgba(0,0,0,.46),0 0 42px rgba(92,77,255,.18);transform:translateY(14px) scale(.98);transition:transform .24s ease}
    .es-perm-show .es-perm-card{transform:none}
    .es-perm-card:before,.es-perm-card:after{content:"";position:absolute;width:4px;height:4px;border-radius:50%;background:#9c8cff;box-shadow:26px 18px #54d9ff,160px 4px #b48cff,230px 42px #54d9ff;opacity:.7;animation:esPermTwinkle 2.4s ease-in-out infinite}
    .es-perm-card:before{top:14px;left:18px}.es-perm-card:after{right:26px;bottom:24px;animation-delay:1s}
    @keyframes esPermTwinkle{50%{opacity:.18;transform:scale(.7)}100%{opacity:.7;transform:scale(1)}}
    .es-perm-icon{width:64px;height:64px;display:grid;place-items:center;margin:0 auto 18px;border-radius:20px;color:#8d82ff;background:rgba(111,93,255,.14);border:1px solid rgba(133,119,255,.34);box-shadow:0 0 26px rgba(102,84,255,.16)}
    .es-perm-icon svg{width:31px;height:31px}.es-perm-card h2{margin:0;text-align:center;font-size:1.24rem;letter-spacing:.01em}.es-perm-card p{margin:10px 0 22px;color:#bfc5e2;text-align:center;line-height:1.55;font-size:.9rem}.es-perm-actions{display:flex;gap:10px}.es-perm-actions button{flex:1;border:0;border-radius:13px;padding:12px 14px;font:700 .82rem inherit;cursor:pointer}.es-perm-cancel{color:#c6c9dd;background:rgba(255,255,255,.07)}.es-perm-continue{color:#fff;background:linear-gradient(135deg,#695cff,#9b61ff);box-shadow:0 8px 20px rgba(104,82,255,.25)}.es-perm-help{margin-top:14px!important;margin-bottom:0!important;font-size:.76rem!important;color:#9098be!important}
    @media(max-width:480px){.es-perm-card{padding:24px 19px;border-radius:20px}.es-perm-actions button{padding:13px 10px}}
  `;
  document.head.appendChild(style);
}

const icons = {
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  microphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>',
  notification: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4"/></svg>'
};

function permissionError(message) { const e = new Error(message); e.name = "PermissionGateError"; return e; }

function ask({ kind, title, reason, blocked = false }) {
  ensureStyles();
  return new Promise((resolve, reject) => {
    const root = document.createElement("div");
    root.className = "es-perm-backdrop";
    const noun = kind === "camera" ? "camera" : kind === "microphone" ? "microphone" : "notifications";
    root.innerHTML = `<div class="es-perm-card" role="dialog" aria-modal="true" aria-labelledby="esPermTitle"><div class="es-perm-icon">${icons[kind] || icons.notification}</div><h2 id="esPermTitle">${title}</h2><p>${reason}</p><div class="es-perm-actions"><button type="button" class="es-perm-cancel">Not now</button><button type="button" class="es-perm-continue">${blocked ? "Try again" : `Allow ${noun}`}</button></div>${blocked ? '<p class="es-perm-help">This browser has blocked access. Use the lock/settings icon beside the address bar to allow it, then try again.</p>' : '<p class="es-perm-help">Your browser will ask for permission next.</p>'}</div>`;
    document.body.appendChild(root);
    const close = (ok) => { root.classList.remove("es-perm-show"); setTimeout(() => root.remove(), 220); ok ? resolve(true) : reject(permissionError(`${title} was cancelled.`)); };
    root.querySelector(".es-perm-cancel").addEventListener("click", () => close(false));
    root.querySelector(".es-perm-continue").addEventListener("click", () => close(true));
    requestAnimationFrame(() => root.classList.add("es-perm-show"));
  });
}

export async function requestMedia(constraints, { kind = constraints && constraints.video ? "camera" : "microphone", title, reason } = {}) {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") throw permissionError(`${kind === "camera" ? "Camera" : "Microphone"} access is not supported on this browser.`);
  if (window.isSecureContext === false) throw permissionError("This permission needs a secure HTTPS connection.");
  let state = "prompt";
  try { if (navigator.permissions && navigator.permissions.query) state = (await navigator.permissions.query({ name: kind })).state; } catch { /* browsers may not expose media permission state */ }
  if (state === "denied") await ask({ kind, title: title || `Allow ${kind} access`, reason: reason || `ES TEAMS needs your ${kind} to continue.`, blocked: true });
  else await ask({ kind, title: title || `Use your ${kind}`, reason: reason || `ES TEAMS only uses your ${kind} for this feature and does not bypass your browser security.` });
  try { return await navigator.mediaDevices.getUserMedia(constraints); }
  catch (err) {
    if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) throw permissionError(`${kind === "camera" ? "Camera" : "Microphone"} access was denied or blocked. Allow it in your browser site settings and try again.`);
    if (err && (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")) throw permissionError(`No ${kind} was found on this device.`);
    throw err;
  }
}

export async function requestNotifications() {
  if (!("Notification" in window)) throw permissionError("Browser notifications are not supported on this device.");
  if (Notification.permission === "denied") await ask({ kind: "notification", title: "Notifications are blocked", reason: "Allow notifications in your browser site settings, then try again.", blocked: true });
  else await ask({ kind: "notification", title: "Stay up to date", reason: "ES TEAMS uses notifications for account alerts and messages. You choose whether to allow them." });
  const result = await Notification.requestPermission();
  if (result !== "granted") throw permissionError("Notification permission was not granted.");
  return result;
}
