import { siteHeadFor } from "../config/site.js";

export function renderVerify(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("verify")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  display:flex;align-items:center;justify-content:center;min-height:100%;padding:24px;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.v-wrap{width:100%;max-width:380px;text-align:center}
.v-logo{
  display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.v-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:32px 24px;box-shadow:0 20px 60px rgba(0,0,0,.4);
}
.v-icon{
  width:52px;height:52px;border-radius:50%;background:rgba(0,224,255,.1);
  display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--accent);
}
.v-icon svg{width:26px;height:26px}
.v-title{font-family:var(--font-display);font-weight:700;font-size:1.15rem;margin-bottom:6px}
.v-sub{font-size:.85rem;color:var(--muted);margin-bottom:26px;line-height:1.5}
.v-sub b{color:var(--text)}

.code-row{display:flex;gap:8px;justify-content:center;margin-bottom:20px}
.code-digit{
  width:44px;height:52px;text-align:center;font-size:1.3rem;font-weight:700;
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);
  font-family:var(--font-mono);transition:border-color .2s var(--ease);
}
.code-digit:focus{border-color:var(--accent)}

.v-timer{font-family:var(--font-mono);font-size:.85rem;color:var(--muted);margin-bottom:18px}
.v-timer b{color:var(--accent)}
.v-timer.expired b{color:var(--red)}

.v-submit{
  width:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#04141a;
  font-weight:700;font-size:.9rem;padding:12px;border-radius:10px;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.v-submit:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.v-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

.v-resend{
  margin-top:16px;background:transparent;border:none;color:var(--accent);font-size:.8rem;font-weight:600;
}
.v-resend:disabled{color:var(--muted2);cursor:not-allowed}

.v-error{
  background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red);
  font-size:.8rem;padding:10px 12px;border-radius:8px;display:none;margin-bottom:16px;text-align:left;
}
.v-error.show{display:block}
</style>
</head>
<body>

<div class="v-wrap">
  <div class="v-logo">ES TEAMS TV</div>
  <div class="v-card">
    <div class="v-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/><path d="M4 6l8 7 8-7"/></svg>
    </div>
    <div class="v-title">Check your email</div>
    <div class="v-sub">We sent a 6-digit code to<br><b id="emailLabel"></b></div>
    <div class="v-sub" style="color:var(--muted);font-size:.75rem;margin-top:8px">If you don't see it, check your spam folder</div>

    <div class="v-error" id="vError"></div>

    <form id="codeForm">
      <div class="code-row">
        <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="v-timer" id="vTimer">Code expires in <b id="timerVal">5:00</b></div>
      <button type="submit" class="v-submit" id="vSubmit">Verify</button>
    </form>
    <button class="v-resend" id="vResend" disabled>Resend code (<span id="resendWait">30</span>s)</button>
  </div>
</div>

<script nonce="__CSP_NONCE__">
const params = new URLSearchParams(window.location.search);
const uid = params.get('uid');
const email = params.get('email');
const purpose = params.get('purpose') || 'signup';
document.getElementById('emailLabel').textContent = email || '';

const digits = Array.from(document.querySelectorAll('.code-digit'));
digits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < digits.length - 1) digits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (digits[idx]) digits[idx].value = ch; });
    if (digits[text.length - 1]) digits[text.length - 1].focus();
  });
});

let secondsLeft = 300;
const timerVal = document.getElementById('timerVal');
const timerWrap = document.getElementById('vTimer');
const vSubmit = document.getElementById('vSubmit');
const timerInterval = setInterval(() => {
  secondsLeft--;
  if (secondsLeft <= 0) {
    clearInterval(timerInterval);
    timerVal.textContent = 'expired';
    timerWrap.classList.add('expired');
    vSubmit.disabled = true;
    return;
  }
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  timerVal.textContent = m + ':' + String(s).padStart(2, '0');
}, 1000);

let resendWait = 30;
const resendBtn = document.getElementById('vResend');
const resendWaitEl = document.getElementById('resendWait');
const resendInterval = setInterval(() => {
  resendWait--;
  if (resendWait <= 0) {
    clearInterval(resendInterval);
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend code';
  } else {
    resendWaitEl.textContent = resendWait;
  }
}, 1000);

const errorBox = document.getElementById('vError');
function showError(msg){ errorBox.textContent = msg; errorBox.classList.add('show'); }
function clearError(){ errorBox.classList.remove('show'); }

async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

resendBtn.addEventListener('click', async () => {
  clearError();
  resendBtn.disabled = true;
  try {
    await postJSON('/api/resend-code', purpose === 'signup' ? { email, purpose } : { uid, purpose });
    secondsLeft = 300;
    timerWrap.classList.remove('expired');
    vSubmit.disabled = false;
    resendWait = 30;
    resendBtn.textContent = 'Resend code (30s)';
    const retry = setInterval(() => {
      resendWait--;
      if (resendWait <= 0) { clearInterval(retry); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
      else { resendBtn.textContent = 'Resend code (' + resendWait + 's)'; }
    }, 1000);
  } catch (err) {
    showError(err.message);
    resendBtn.disabled = false;
  }
});

document.getElementById('codeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const code = digits.map(d => d.value).join('');
  if (code.length !== 6) { showError('Enter all 6 digits.'); return; }
  vSubmit.disabled = true;
  vSubmit.textContent = 'Verifying…';
  try {
    if (purpose === 'signup') {
      const { customToken } = await postJSON('/api/verify-email', { email, code, purpose });
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const firebaseConfig = ${JSON.stringify(cfg.firebaseConfig)};
      const app = initializeApp(firebaseConfig);
      const fbAuth = getAuth(app);
      const cred = await signInWithCustomToken(fbAuth, customToken);
      const idToken = await cred.user.getIdToken();
      await postJSON('/api/session', { idToken, remember: true });
      window.location.href = '/?welcome=1';
    } else {
      const { resetToken } = await postJSON('/api/verify-email', { uid, code, purpose });
      window.location.href = '/account?resetToken=' + encodeURIComponent(resetToken);
    }
  } catch (err) {
    showError(err.message);
    vSubmit.disabled = false;
    vSubmit.textContent = 'Verify';
  }
});
</script>
</body>
</html>`;
}
