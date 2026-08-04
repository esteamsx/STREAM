import { siteHeadFor } from "../config/site.js";

export function renderReset(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("reset")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>Reset Password: ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--red-dim:#8f1530;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
  --card:#15151F;--card2:#1B1B27;
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
a{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}

.auth-wrap{width:100%;max-width:380px}
.back-row{margin-bottom:14px}
.back-link{
  display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;
  font-size:.82rem;font-weight:600;
}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}

.auth-logo{
  display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.auth-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.4);
}

.step{display:none;flex-direction:column;gap:14px}
.step.active{display:flex}

.step-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem;margin-bottom:2px}
.step-sub{font-size:.82rem;color:var(--muted);line-height:1.5;margin-bottom:4px}
.step-sub b{color:var(--text)}

.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.input-wrap{position:relative}
.field input{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-size:.9rem;transition:border-color .2s var(--ease);
}
.field input::placeholder{color:var(--muted2)}
.field input:focus{border-color:var(--accent)}
.pw-toggle{
  position:absolute;right:6px;top:50%;transform:translateY(-50%);background:transparent;border:none;
  padding:6px;color:var(--muted);display:flex;border-radius:6px;
}
.pw-toggle:hover{color:var(--accent)}
.pw-toggle svg{width:18px;height:18px}
.pw-toggle .eye-off{display:none}
.pw-toggle.shown .eye{display:none}
.pw-toggle.shown .eye-off{display:block}

.code-row{display:flex;gap:8px;justify-content:center;margin:4px 0}
.code-digit{
  width:44px;height:52px;text-align:center;font-size:1.3rem;font-weight:700;
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);
  font-family:var(--font-mono);transition:border-color .2s var(--ease);
}
.code-digit:focus{border-color:var(--accent)}

.r-timer{font-family:var(--font-mono);font-size:.82rem;color:var(--muted);text-align:center}
.r-timer b{color:var(--accent)}
.r-timer.expired b{color:var(--red)}

.r-resend{
  background:transparent;border:none;color:var(--accent);font-size:.8rem;font-weight:600;
  align-self:center;
}
.r-resend:disabled{color:var(--muted2);cursor:not-allowed}

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;
  border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;
  animation:spin .6s linear infinite;
}
.auth-submit{
  background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#04141a;
  font-weight:700;font-size:.9rem;padding:12px;border-radius:10px;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.auth-submit:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.auth-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

.auth-error{
  background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red);
  font-size:.8rem;padding:10px 12px;border-radius:8px;display:none;
}
.auth-error.show{display:block}

.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;
}
.page-overlay.show{display:flex}
.overlay-card{
  width:100%;max-width:360px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;
  padding:26px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
}
</style>
</head>
<body>

<div class="auth-wrap">
  <div class="back-row">
    <a href="/login" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
      Back
    </a>
  </div>
  <div class="auth-logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    ES TEAMS TV
  </div>
  <div class="auth-card">

    <div class="auth-error" id="rError"></div>

    <div class="step active" id="stepEmail">
      <div class="step-title">Reset your password</div>
      <div class="step-sub">Enter the email or username on your account and we'll send you a reset code.</div>
      <div class="field">
        <label>Email or Username</label>
        <input type="text" id="resetEmail" placeholder="you@example.com or username" required autocomplete="username">
      </div>
      <button type="button" class="auth-submit" id="emailSubmit">Send Reset Code</button>
    </div>

    <div class="step" id="stepCode">
      <div class="step-title">Enter reset code</div>
      <div class="step-sub">We sent a 6-digit code to<br><b id="codeEmailLabel"></b></div>
      <div class="code-row">
        <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="r-timer" id="rTimer">Code expires in <b id="timerVal">5:00</b></div>
      <button type="button" class="auth-submit" id="verifyCodeBtn">Verify Code</button>
      <button type="button" class="r-resend" id="rResend" disabled>Resend code (<span id="resendWait">30</span>s)</button>
    </div>

  </div>
</div>

<div class="page-overlay" id="pwOverlay">
  <div class="overlay-card">
    <div class="step-title">Set new password</div>
    <div class="step-sub">Choose a new password for your account.</div>
    <div class="auth-error" id="overlayError"></div>
    <div class="field">
      <label>New Password</label>
      <div class="input-wrap">
        <input type="password" id="newPassword" placeholder="At least 6 characters" minlength="6" autocomplete="new-password">
        <button type="button" class="pw-toggle" data-target="newPassword" aria-label="Show password">
          <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
        </button>
      </div>
    </div>
    <div class="field">
      <label>Confirm Password</label>
      <div class="input-wrap">
        <input type="password" id="confirmNewPassword" placeholder="Re-enter new password" minlength="6" autocomplete="new-password">
        <button type="button" class="pw-toggle" data-target="confirmNewPassword" aria-label="Show password">
          <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
        </button>
      </div>
    </div>
    <button type="button" class="auth-submit" id="resetSubmit" style="width:100%">Reset Password</button>
  </div>
</div>

<script nonce="__CSP_NONCE__" type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = ${JSON.stringify(cfg.firebaseConfig)};
const app = initializeApp(firebaseConfig);
const fbAuth = getAuth(app);

const errorBox = document.getElementById('rError');
function showError(msg){ errorBox.textContent = msg; errorBox.classList.add('show'); }
function clearError(){ errorBox.classList.remove('show'); }

async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const shown = btn.classList.toggle('shown');
    input.type = shown ? 'text' : 'password';
  });
});

let uid = null;
let email = null;
let timerInterval = null;
let secondsLeft = 300;

function startTimer(){
  secondsLeft = 300;
  const timerVal = document.getElementById('timerVal');
  const timerWrap = document.getElementById('rTimer');
  const verifyCodeBtn = document.getElementById('verifyCodeBtn');
  timerWrap.classList.remove('expired');
  verifyCodeBtn.disabled = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerVal.textContent = 'expired';
      timerWrap.classList.add('expired');
      verifyCodeBtn.disabled = true;
      return;
    }
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    timerVal.textContent = m + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function startResendCooldown(){
  let resendWait = 30;
  const resendBtn = document.getElementById('rResend');
  const resendWaitEl = document.getElementById('resendWait');
  resendBtn.disabled = true;
  resendBtn.textContent = 'Resend code (30s)';
  const interval = setInterval(() => {
    resendWait--;
    if (resendWait <= 0) {
      clearInterval(interval);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend code';
    } else {
      resendBtn.textContent = 'Resend code (' + resendWait + 's)';
    }
  }, 1000);
}

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

document.getElementById('emailSubmit').addEventListener('click', async () => {
  clearError();
  const identifier = document.getElementById('resetEmail').value.trim();
  if (!identifier) { showError('Please enter your email or username.'); return; }
  const btn = document.getElementById('emailSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Sending…';
  try {
    const data = await postJSON('/api/request-password-reset', { identifier });
    uid = data.uid;
    email = data.email;
    document.getElementById('codeEmailLabel').textContent = email;
    document.getElementById('stepEmail').classList.remove('active');
    document.getElementById('stepCode').classList.add('active');
    startTimer();
    startResendCooldown();
  } catch (err) {
    showError(err.code === 'auth/user-disabled'
      ? 'This account has been recently deactivated.'
      : err.message);
  }
  btn.disabled = false;
  btn.textContent = 'Send Reset Code';
});

document.getElementById('rResend').addEventListener('click', async () => {
  clearError();
  const resendBtn = document.getElementById('rResend');
  resendBtn.disabled = true;
  try {
    await postJSON('/api/resend-code', { uid, purpose: 'forgot_password' });
    startTimer();
    startResendCooldown();
  } catch (err) {
    showError(err.message);
    resendBtn.disabled = false;
  }
});

document.getElementById('verifyCodeBtn').addEventListener('click', async () => {
  clearError();
  const code = digits.map(d => d.value).join('');
  if (code.length !== 6) { showError('Enter all 6 digits.'); return; }
  const btn = document.getElementById('verifyCodeBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Verifying…';
  try {
    const { resetToken } = await postJSON('/api/verify-reset-code', { uid, code });
    window.resetToken = resetToken;
    document.getElementById('pwOverlay').classList.add('show');
  } catch (err) {
    showError(err.message);
  }
  btn.disabled = false;
  btn.textContent = 'Verify Code';
});

document.getElementById('resetSubmit').addEventListener('click', async () => {
  const overlayError = document.getElementById('overlayError');
  overlayError.classList.remove('show');
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  if (newPassword.length < 6) { overlayError.textContent = 'Password must be at least 6 characters.'; overlayError.classList.add('show'); return; }
  if (newPassword !== confirmNewPassword) { overlayError.textContent = 'Passwords do not match.'; overlayError.classList.add('show'); return; }
  const btn = document.getElementById('resetSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Resetting…';
  try {
    const { customToken } = await postJSON('/api/reset-password', { resetToken: window.resetToken, newPassword });
    const cred = await signInWithCustomToken(fbAuth, customToken);
    const idToken = await cred.user.getIdToken();
    await postJSON('/api/session', { idToken, remember: true });
    window.location.href = '/';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Reset Password';
    overlayError.textContent = err.message;
    overlayError.classList.add('show');
  }
});
</script>
</body>
</html>`;
}
