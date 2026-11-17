(() => {
  if (!window.__ES_NATIVE_APP__) return;
  if (document.getElementById('esNativeAppShell')) return;

  const style = document.createElement('style');
  style.id = 'esNativeAppShellStyle';
  style.textContent = `
    #esNativeAppShell{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#080B18;color:#F3F3FA;opacity:1;visibility:visible;transition:opacity .28s ease,visibility .28s ease;}
    #esNativeAppShell.es-shell-leaving{opacity:0;visibility:hidden;pointer-events:none}
    #esNativeAppShell::before,#esNativeAppShell::after{content:"";position:absolute;border-radius:50%;pointer-events:none;filter:blur(42px);opacity:.42}
    #esNativeAppShell::before{width:270px;height:270px;top:-100px;left:-80px;background:#00E0FF}
    #esNativeAppShell::after{width:300px;height:300px;right:-110px;bottom:-120px;background:#7C5CFF}
    #esNativeAppShell .es-shell-card{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 30px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(255,255,255,.035) 46%,rgba(255,255,255,.07)),rgba(8,11,24,.7);box-shadow:0 22px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.18);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);animation:esShellCardIn .7s cubic-bezier(.22,1,.36,1) both}
    #esNativeAppShell .es-shell-mark{position:relative;width:78px;height:78px;display:grid;place-items:center;border-radius:23px;background:linear-gradient(135deg,#00E0FF,#7C5CFF);color:#06101d;font:700 1.05rem/1 'Space Grotesk',Inter,system-ui,sans-serif;letter-spacing:-.06em;box-shadow:0 12px 36px rgba(0,224,255,.3);animation:esShellMark 1.8s ease-in-out infinite}
    #esNativeAppShell .es-shell-mark img{width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 3px 8px rgba(0,0,0,.22))}
    #esNativeAppShell .es-shell-mark::after{content:"";position:absolute;inset:-7px;border:1px solid rgba(0,224,255,.35);border-radius:28px;animation:esShellPulse 1.8s ease-out infinite}
    #esNativeAppShell .es-shell-title{font:700 clamp(1.35rem,6vw,1.8rem)/1.05 'Space Grotesk',Inter,system-ui,sans-serif;letter-spacing:-.045em;background:linear-gradient(90deg,#00E0FF,#B49CFF);-webkit-background-clip:text;background-clip:text;color:transparent}
    #esNativeAppShell .es-shell-subtitle{color:rgba(255,255,255,.55);font:500 .72rem/1.4 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}
    #esNativeAppShell .es-shell-spinner{width:20px;height:20px;margin-top:6px;border:2px solid rgba(255,255,255,.2);border-top-color:#00E0FF;border-right-color:#7C5CFF;border-radius:50%;animation:esShellSpin .7s linear infinite}
    @keyframes esShellCardIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}
    @keyframes esShellMark{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(2deg)}}
    @keyframes esShellPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:0;transform:scale(1.16)}}
    @keyframes esShellSpin{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){#esNativeAppShell .es-shell-card,#esNativeAppShell .es-shell-mark,#esNativeAppShell .es-shell-mark::after,#esNativeAppShell .es-shell-spinner{animation:none!important}}
  `;
  document.head.appendChild(style);

  const shell = document.createElement('div');
  shell.id = 'esNativeAppShell';
  shell.setAttribute('aria-live', 'polite');
  shell.setAttribute('aria-label', 'Loading ES TEAMS TV');
  shell.innerHTML = `
    <div class="es-shell-card">
      <div class="es-shell-mark" aria-hidden="true"><img src="/favicon.svg" alt=""></div>
      <div class="es-shell-title">ES TEAMS TV</div>
      <div class="es-shell-subtitle">Your world. On screen.</div>
      <div class="es-shell-spinner" aria-hidden="true"></div>
    </div>`;
  document.body.appendChild(shell);

  let leaving = false;
  function hideShell() {
    if (leaving) return;
    leaving = true;
    shell.classList.add('es-shell-leaving');
    setTimeout(() => shell.remove(), 360);
  }

  function isNavigableSameSite(link, event) {
    if (!link || event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download') || link.closest('[data-no-app-transition]')) return false;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
    if (/^\/api\/(?:telegram|github)-auth\/start$/.test(url.pathname)) return false;
    return true;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (isNavigableSameSite(link, event)) shell.classList.remove('es-shell-leaving');
  }, true);

  window.addEventListener('pageshow', hideShell, { once: true });
  window.addEventListener('load', () => setTimeout(hideShell, 180), { once: true });
  if (document.readyState === 'complete') setTimeout(hideShell, 180);
})();
