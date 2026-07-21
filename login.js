export function renderLogin(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign In — ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
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
  min-height:100vh;padding:40px 20px;
  display:flex;align-items:center;justify-content:center;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.auth-wrap{width:100%;max-width:380px;margin:0 auto}
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
@media(max-width:380px){
  body{padding:28px 14px}
  .auth-card{padding:22px 16px}
  .auth-logo{font-size:1.12rem;gap:8px}
  .field-row{gap:8px}
}
.auth-tabs{display:flex;gap:4px;background:var(--dark3);border-radius:10px;padding:4px;margin-bottom:22px}
.auth-tab{
  flex:1;text-align:center;padding:9px 0;border:none;background:transparent;color:var(--muted);
  font-size:.85rem;font-weight:600;border-radius:8px;transition:all .2s var(--ease);
}
.auth-tab.active{background:var(--card2);color:var(--text);box-shadow:0 1px 0 rgba(255,255,255,.05) inset}

.auth-form{display:none;flex-direction:column;gap:14px}
.auth-form.active{display:flex}

.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.field-row{display:flex;gap:10px}
.field-row .field{flex:1}
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

.captcha-box{
  display:flex;align-items:center;gap:12px;background:var(--dark3);border:1px solid var(--border-strong);
  border-radius:10px;padding:12px 14px;user-select:none;
}
.captcha-check{
  width:22px;height:22px;border-radius:5px;border:2px solid var(--muted);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);position:relative;
}
.captcha-check.checked{border-color:var(--accent);background:rgba(0,224,255,.15)}
.captcha-check svg{width:14px;height:14px;color:var(--accent);opacity:0;transform:scale(.5);transition:all .2s var(--ease)}
.captcha-check.checked svg{opacity:1;transform:scale(1)}
.captcha-spinner{
  width:16px;height:16px;border:2px solid var(--muted2);border-top-color:var(--accent);border-radius:50%;
  animation:spin .6s linear infinite;display:none;
}
.captcha-check.loading .captcha-spinner{display:block}
.captcha-check.loading svg{display:none}
@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;
  border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;
  animation:spin .6s linear infinite;
}
.captcha-label{font-size:.82rem;color:var(--text);flex:1}
.captcha-label small{display:block;color:var(--muted2);font-size:.65rem;margin-top:1px}

.auth-submit{
  background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#04141a;
  font-weight:700;font-size:.9rem;padding:12px;border-radius:10px;margin-top:4px;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.auth-submit:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.auth-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

.auth-divider{display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--muted2);font-size:.72rem}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--border-strong)}

.remember-row{display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--muted);cursor:pointer;user-select:none}
.remember-row input{width:15px;height:15px;accent-color:var(--accent)}

.gsi-wrap{display:flex;justify-content:center}

.auth-error{
  background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red);
  font-size:.8rem;padding:10px 12px;border-radius:8px;display:none;
}
.auth-error.show{display:block}

.auth-foot{text-align:center;margin-top:16px;font-size:.78rem;color:var(--muted)}
.auth-foot a{color:var(--accent);text-decoration:none;font-weight:600}
.legal-links{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:10px}
.legal-links a{color:var(--muted);text-decoration:underline;font-weight:500;font-size:.72rem;transition:color .2s var(--ease)}
.legal-links a:hover{color:var(--text)}

.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;
}
.page-overlay.show{display:flex}
.overlay-card{
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:30px 36px;
  display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
}
.overlay-spinner{
  width:30px;height:30px;border:3px solid var(--border-strong);border-top-color:var(--accent);
  border-radius:50%;animation:spin .7s linear infinite;
}
.overlay-text{font-size:.85rem;color:var(--text);font-weight:600}
.overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.overlay-sub{font-size:.82rem;color:var(--muted);line-height:1.5;text-align:center}
.code-row{display:flex;gap:8px;justify-content:center}
.code-digit{
  width:40px;height:48px;text-align:center;font-size:1.2rem;font-weight:700;
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);
  font-family:var(--font-mono);
}
.code-digit:focus{border-color:var(--accent)}
.overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;text-decoration:underline}

.lg-toast{
  position:fixed;top:16px;left:50%;transform:translate(-50%,-160%);
  display:flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px;
  background:rgba(28,28,36,.5);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.16);
  color:#fff;font-size:.86rem;font-weight:600;letter-spacing:.01em;white-space:nowrap;
  z-index:1000;pointer-events:none;opacity:0;
  transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .35s ease;
}
.lg-toast.show{transform:translate(-50%,0);opacity:1}
.lg-toast .lg-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));flex-shrink:0}

.uname-status{font-size:.72rem;color:var(--muted);display:flex;align-items:center;gap:6px;min-height:14px}
.uname-status.ok{color:var(--accent)}
.uname-status.taken{color:var(--red)}
.uname-status svg{width:12px;height:12px;flex-shrink:0}

.uname-spinner{width:11px;height:11px;border:2px solid var(--muted2);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0}
</style>
</head>
<body>

<div class="auth-wrap">
  <div class="auth-logo"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>ES TEAMS TV</div>
  <div class="auth-card">

    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Sign In</button>
      <button class="auth-tab" data-tab="signup">Create Account</button>
    </div>

    <div class="auth-error" id="authError"></div>

    <form class="auth-form active" id="loginForm">
      <div class="field">
        <label>Email or Username</label>
        <input type="text" id="loginEmail" placeholder="you@example.com or username" required autocomplete="username">
      </div>
      <div class="field">
        <label>Password</label>
        <div class="input-wrap">
          <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password">
          <button type="button" class="pw-toggle" data-target="loginPassword" aria-label="Show password">
            <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
          </button>
        </div>
      </div>
      <div class="captcha-box" id="loginCaptchaBox">
        <altcha-widget id="loginAltcha" name="loginAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget>
      </div>
      <label class="remember-row">
        <input type="checkbox" id="rememberMe" checked>
        <span>Keep me signed in</span>
      </label>
      <button type="submit" class="auth-submit" id="loginSubmit" disabled>Sign In</button>
    </form>

    <form class="auth-form" id="signupForm">
      <div class="field-row">
        <div class="field">
          <label>First Name</label>
          <input type="text" id="suFirst" placeholder="John" required autocomplete="given-name">
        </div>
        <div class="field">
          <label>Last Name</label>
          <input type="text" id="suLast" placeholder="Doe" required autocomplete="family-name">
        </div>
      </div>
      <div class="field">
        <label>Email</label>
        <input type="email" id="suEmail" placeholder="you@example.com" required autocomplete="email">
      </div>
      <div class="field">
        <label>Username</label>
        <input type="text" id="suUsername" placeholder="username" required autocomplete="off" minlength="3" maxlength="20">
        <div class="uname-status" id="suUsernameStatus"></div>
      </div>
      <div class="field">
        <label>Password</label>
        <div class="input-wrap">
          <input type="password" id="suPassword" placeholder="At least 6 characters" required autocomplete="new-password" minlength="6">
          <button type="button" class="pw-toggle" data-target="suPassword" aria-label="Show password">
            <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
          </button>
        </div>
      </div>
      <div class="field">
        <label>Confirm Password</label>
        <div class="input-wrap">
          <input type="password" id="suConfirmPassword" placeholder="Confirm password" required autocomplete="new-password" minlength="6">
          <button type="button" class="pw-toggle" data-target="suConfirmPassword" aria-label="Show password">
            <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
          </button>
        </div>
      </div>
      <div class="captcha-box" id="captchaBox">
        <altcha-widget id="signupAltcha" name="signupAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget>
      </div>
      <button type="submit" class="auth-submit" id="signupSubmit" disabled>Create Account</button>
    </form>

    <div class="auth-divider">OR</div>
    <div class="gsi-wrap" id="gsiWrap"></div>

    <div class="auth-foot" id="authFoot">
      <a href="/reset" id="forgotPasswordLink">Forgot Password?</a>
      <div class="legal-links">
        <a href="/privacy">Privacy</a>
        <a href="/dmca">DMCA</a>
      </div>
    </div>
  </div>
</div>

<div class="page-overlay" id="pageOverlay">
  <div class="overlay-card">
    <div class="overlay-spinner"></div>
    <div class="overlay-text">Signing in with Google…</div>
  </div>
</div>

<div class="page-overlay" id="tfaLoginOverlay">
  <div class="overlay-card" style="max-width:340px">
    <div class="overlay-title">Two-Factor Authentication</div>
    <div class="overlay-sub">Enter the 6-digit code from your authenticator app.</div>
    <div class="code-row">
      <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
      <input class="code-digit" maxlength="1" inputmode="numeric">
      <input class="code-digit" maxlength="1" inputmode="numeric">
      <input class="code-digit" maxlength="1" inputmode="numeric">
      <input class="code-digit" maxlength="1" inputmode="numeric">
      <input class="code-digit" maxlength="1" inputmode="numeric">
    </div>
    <div class="auth-error" id="tfaLoginError"></div>
    <button type="button" class="auth-submit" id="tfaLoginContinueBtn" style="width:100%">Continue</button>
    <button type="button" class="overlay-cancel" id="tfaLoginCancel">Cancel</button>
  </div>
</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = ${JSON.stringify(cfg.firebaseConfig)};
const app = initializeApp(firebaseConfig);
const fbAuth = getAuth(app);

function showLiquidToast(message){
  const toast = document.createElement('div');
  toast.className = 'lg-toast';
  toast.innerHTML = '<span class="lg-dot"></span><span></span>';
  toast.querySelector('span:last-child').textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 2600);
}

(function(){
  const params = new URLSearchParams(window.location.search);
  if (params.get('logged_out') === '1') {
    showLiquidToast('Logged Out');
    params.delete('logged_out');
    const rest = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (rest ? '?' + rest : ''));
  }
})();

const tabs = document.querySelectorAll('.auth-tab');
const forms = { login: document.getElementById('loginForm'), signup: document.getElementById('signupForm') };
const authFoot = document.getElementById('authFoot');
const errorBox = document.getElementById('authError');

function showError(msg){ errorBox.textContent = msg; errorBox.classList.add('show'); }
function clearError(){ errorBox.classList.remove('show'); }

function setTab(name){
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  forms.login.classList.toggle('active', name === 'login');
  forms.signup.classList.toggle('active', name === 'signup');
  clearError();
}
tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const shown = btn.classList.toggle('shown');
    input.type = shown ? 'text' : 'password';
    btn.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
  });
});

let loginCaptchaPassed = false;
let loginCaptchaValue = '';
const loginAltcha = document.getElementById('loginAltcha');
const loginSubmit = document.getElementById('loginSubmit');
loginAltcha.addEventListener('statechange', (ev) => {
  const state = ev.detail.state;
  loginCaptchaPassed = state === 'verified';
  loginCaptchaValue = loginCaptchaPassed ? ev.detail.payload : '';
  loginSubmit.disabled = !loginCaptchaPassed;
});

let captchaPassed = false;
let signupCaptchaValue = '';
const signupAltcha = document.getElementById('signupAltcha');
const signupSubmit = document.getElementById('signupSubmit');
signupAltcha.addEventListener('statechange', (ev) => {
  const state = ev.detail.state;
  captchaPassed = state === 'verified';
  signupCaptchaValue = captchaPassed ? ev.detail.payload : '';
  updateSignupSubmitState();
});

let usernameAvailable = false;
let usernameCheckSeq = 0;
const suUsername = document.getElementById('suUsername');
const suUsernameStatus = document.getElementById('suUsernameStatus');

function updateSignupSubmitState(){
  signupSubmit.disabled = !(captchaPassed && usernameAvailable);
}

function setUsernameStatus(cls, html){
  suUsernameStatus.className = 'uname-status' + (cls ? ' ' + cls : '');
  suUsernameStatus.innerHTML = html;
}

suUsername.addEventListener('input', () => {
  usernameAvailable = false;
  updateSignupSubmitState();
  const val = suUsername.value.trim().toLowerCase();
  const seq = ++usernameCheckSeq;
  if (!val) { setUsernameStatus('', ''); return; }
  if (!/^[a-z0-9_]{3,20}$/.test(val)) {
    setUsernameStatus('taken', '3-20 characters: letters, numbers, underscore only.');
    return;
  }
  setUsernameStatus('', '<span class="uname-spinner"></span>Checking Username ..');
  setTimeout(async () => {
    if (seq !== usernameCheckSeq) return;
    try {
      const res = await fetch('/api/check-username?username=' + encodeURIComponent(val));
      const data = await res.json();
      if (seq !== usernameCheckSeq) return;
      if (data.available) {
        usernameAvailable = true;
        setUsernameStatus('ok', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Username available');
      } else {
        usernameAvailable = false;
        setUsernameStatus('taken', data.error || 'Username has already been used.');
      }
    } catch {
      if (seq !== usernameCheckSeq) return;
      usernameAvailable = false;
      setUsernameStatus('taken', 'Could not check username right now — try again in a moment.');
    }
    updateSignupSubmitState();
  }, 450);
});

async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function establishSession(idToken, remember, altcha){
  const data = await postJSON('/api/session', { idToken, remember, altcha });
  document.getElementById('pageOverlay').classList.remove('show');
  if (data.requires2FA) {
    await promptTwoFactor(data.pendingToken);
    return;
  }
  window.location.href = '/?welcome=1';
}

const tfaDigits = Array.from(document.querySelectorAll('#tfaLoginOverlay .code-digit'));
tfaDigits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < tfaDigits.length - 1) tfaDigits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) tfaDigits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (tfaDigits[idx]) tfaDigits[idx].value = ch; });
    if (tfaDigits[text.length - 1]) tfaDigits[text.length - 1].focus();
  });
});

function promptTwoFactor(pendingToken){
  return new Promise((resolve) => {
    const overlay = document.getElementById('tfaLoginOverlay');
    const errorBox = document.getElementById('tfaLoginError');
    const continueBtn = document.getElementById('tfaLoginContinueBtn');
    const cancelBtn = document.getElementById('tfaLoginCancel');
    tfaDigits.forEach(d => d.value = '');
    errorBox.classList.remove('show');
    overlay.classList.add('show');
    tfaDigits[0].focus();

    function cleanup(){
      overlay.classList.remove('show');
      continueBtn.removeEventListener('click', onContinue);
      cancelBtn.removeEventListener('click', onCancel);
    }
    function onCancel(){
      cleanup();
      resolve();
    }
    async function onContinue(){
      const code = tfaDigits.map(d => d.value).join('');
      if (code.length !== 6) {
        errorBox.textContent = 'Enter all 6 digits.';
        errorBox.classList.add('show');
        return;
      }
      continueBtn.disabled = true;
      continueBtn.innerHTML = '<span class="btn-spinner"></span>Verifying…';
      try {
        await postJSON('/api/2fa/login-verify', { pendingToken, code });
        cleanup();
        window.location.href = '/?welcome=1';
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.add('show');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue';
      }
    }
    continueBtn.addEventListener('click', onContinue);
    cancelBtn.addEventListener('click', onCancel);
  });
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  if (!loginCaptchaPassed) { showError('Please complete the captcha.'); return; }
  const identifier = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  
  const btn = document.getElementById('loginSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Logging in…';

  try {
    const { email } = await postJSON('/api/resolve-login-identifier', { identifier });
    const cred = await signInWithEmailAndPassword(fbAuth, email, password);
    const idToken = await cred.user.getIdToken();
    await establishSession(idToken, remember, loginCaptchaValue);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Sign In';
    const msg = err.code === 'auth/user-disabled' 
      ? 'This account has been recently deactivated.'
      : err.message.includes('invalid-credential') || err.message.includes('wrong-password') || err.message.includes('user-not-found')
      ? 'Incorrect email or password.' : err.message;
    showError(msg);
  }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  if (!captchaPassed) { showError('Please complete the captcha.'); return; }
  const firstName = document.getElementById('suFirst').value.trim();
  const lastName = document.getElementById('suLast').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const username = suUsername.value.trim().toLowerCase();
  const password = document.getElementById('suPassword').value;
  const confirmPassword = document.getElementById('suConfirmPassword').value;

  if (!usernameAvailable) { showError('Username has already been used.'); return; }
  if (password !== confirmPassword) { showError('Passwords do not match.'); return; }
  
  const allowedDomains = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','live.com','aol.com','protonmail.com'];
  const domain = (email.split('@')[1] || '').toLowerCase();
  if (!allowedDomains.includes(domain)) { showError('Please enter a valid email address.'); return; }
  
  const btn = document.getElementById('signupSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Creating Account…';

  try {
    await postJSON('/api/signup', { firstName, lastName, email, username, password, altcha: signupCaptchaValue });
    window.location.href = '/verify?email=' + encodeURIComponent(email);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Create Account';
    showError(err.message);
  }
});

if (${JSON.stringify(!!cfg.googleClientId)}) {
  window.handleGoogleCredential = async (response) => {
    clearError();
    const overlay = document.getElementById('pageOverlay');
    overlay.classList.add('show');
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const cred = await signInWithCredential(fbAuth, credential);
      const idToken = await cred.user.getIdToken();
      await establishSession(idToken, true);
    } catch (err) {
      overlay.classList.remove('show');
      showError(err.code === 'auth/user-disabled' ? 'This account has been recently deactivated.' : err.message);
    }
  };
  window.addEventListener('load', () => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: ${JSON.stringify(cfg.googleClientId)},
      callback: window.handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(document.getElementById('gsiWrap'), { theme: 'filled_black', size: 'large', width: 320 });
    window.google.accounts.id.prompt();
  });
}
</script>
</body>
</html>`;
}
