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
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
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
  --nav-bg:rgba(10,10,15,.98);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  display:flex;align-items:center;justify-content:center;min-height:100%;padding:24px;
  overflow-x:hidden;position:relative;
}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.v-wrap{width:100%;max-width:380px;text-align:center;position:relative;z-index:1}
.v-logo{
  display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.v-card{
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.22);border-radius:16px;
  padding:32px 24px;box-shadow:0 20px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3);
}
:root[data-theme="light"] .v-card{
  background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);
  border:1px solid rgba(255,255,255,.65);
  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
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

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

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
const linkToken = params.get('link') || '';
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
      const { initializeApp, getApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js');
      const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const firebaseConfig = ${JSON.stringify(cfg.firebaseConfig)};
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const appCheck = window.__esTeamsFirebaseAppCheck || (window.__esTeamsFirebaseAppCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider('6LeeIy8uAAAAAMID8hOwXSalr-RW5wLdmgYVGAZf'),
        isTokenAutoRefreshEnabled: true,
      }));
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

// Non-login email OTP flows use this page; login/device-login OTPs remain on /login.
const flowConfig = {
  protected_action_email: { title: 'Verify your email', note: 'Confirm your registered email before continuing.', request: ['/api/email-verification/request', {}], confirm: ['/api/email-verification/confirm', (code) => ({ code })], resend: ['/api/email-verification/request', {}] },
  add_email: { title: 'Verify your new email', note: 'Your address is updated only after this code is confirmed.', request: ['/api/account/request-email', { email }], confirm: ['/api/account/confirm-email', (code) => ({ code })], resend: ['/api/account/request-email', { email }] },
  delete_account: { title: 'Confirm account deletion', note: 'This code confirms your request to delete your account.', confirm: ['/api/confirm-account-deletion', (code) => ({ code })], resend: ['/api/resend-code', { uid, purpose }] },
  card_action: { title: 'Verify this security action', note: 'After verification, return and re-enter the action with a fresh anti-bot check.', request: ['/api/card-security/request-otp', {}], confirm: ['/api/card-security/verify-otp', (code) => ({ code })], resend: ['/api/card-security/request-otp', {}] },
  trust_device_add: { title: 'Trust this device', note: 'Confirm the device change. Face ID may also be required.', request: ['/api/devices/trust/request', { trusted: true }], confirm: ['/api/devices/trust/confirm', (code, faceDescriptor) => ({ code, trusted: true, faceDescriptor })], resend: ['/api/devices/trust/request', { trusted: true }] },
  trust_device_remove: { title: 'Update trusted devices', note: 'Confirm that this device should no longer be trusted.', request: ['/api/devices/trust/request', { trusted: false }], confirm: ['/api/devices/trust/confirm', (code) => ({ code, trusted: false })], resend: ['/api/devices/trust/request', { trusted: false }] },
  remove_trusted_devices: { title: 'Remove trusted devices', note: 'Confirm removal of the selected trusted devices.', request: ['/api/devices/trusted-group/remove/request', { deviceIds: (params.get('deviceIds') || '').split(',').filter(Boolean) }], confirm: ['/api/devices/trusted-group/remove/confirm', (code) => ({ code, deviceIds: (params.get('deviceIds') || '').split(',').filter(Boolean) })], resend: ['/api/devices/trusted-group/remove/request', { deviceIds: (params.get('deviceIds') || '').split(',').filter(Boolean) }] },
  password_reset: { title: 'Verify your password change', note: 'Use the code sent to your account email.', confirm: ['/api/verify-email', (code) => ({ uid, code, purpose })], resend: ['/api/resend-code', { uid, purpose }] },
};
const flow = flowConfig[purpose];
if (flow) {
  const safeReturnTo = (() => {
    const value = params.get('returnTo') || '/account';
    return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/account';
  })();
  document.querySelector('.v-title').textContent = flow.title;
  const sub = document.querySelector('.v-sub');
  sub.innerHTML = '';
  const note = document.createElement('span');
  note.textContent = purpose === 'delete_account' && params.get('via') === 'telegram' ? 'Check Telegram for your account-deletion code.' : flow.note;
  sub.appendChild(note);
  if (email) {
    sub.appendChild(document.createElement('br'));
    const label = document.createElement('b');
    label.textContent = email;
    sub.appendChild(label);
  }
  document.title = flow.title + ' | ES TEAMS TV';
  vSubmit.disabled = true;
  resendBtn.disabled = true;
  const showSuccess = (msg) => {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
    errorBox.style.color = 'var(--accent)';
    errorBox.style.borderColor = 'rgba(0,224,255,.35)';
    errorBox.style.background = 'rgba(0,224,255,.08)';
  };
  const linkReady = (async () => {
    if (!linkToken) throw new Error('This verification link has expired or has already been used. Return to your account and start again.');
    const linkInfo = await postJSON('/api/otp-verification-link/validate', {
      link: linkToken, uid: uid || '', email: email || '', purpose,
      returnTo: params.get('returnTo') || '/account', via: params.get('via') || 'email',
      deviceIds: params.get('deviceIds') || '', sent: params.get('sent') || '1',
    });
    if (!email && linkInfo.email) {
      const label = document.createElement('b');
      label.textContent = linkInfo.email;
      sub.appendChild(document.createElement('br'));
      sub.appendChild(label);
      document.getElementById('emailLabel').textContent = linkInfo.email;
    }
    return true;
  })().catch((err) => {
    document.querySelector('.v-title').textContent = 'Verification link expired';
    document.querySelector('.v-sub').textContent = 'This link is no longer active. Return to your account and start the verification again.';
    document.getElementById('codeForm').hidden = true;
    timerWrap.hidden = true;
    resendBtn.hidden = true;
    showError(err.message || 'This verification link is no longer active.');
    return false;
  });
  const requestCode = async (route) => {
    const [url, body] = route;
    const data = await postJSON(url, body);
    if (data.alreadyVerified) {
      await postJSON('/api/otp-verification-link/consume', { link: linkToken });
      showSuccess('Your email is already verified. Returning you now…');
      setTimeout(() => { window.location.assign(safeReturnTo); }, 900);
      return false;
    }
    return true;
  };
  linkReady.then(async (valid) => {
    if (!valid) return;
    digits.forEach((digit) => { digit.disabled = false; });
    vSubmit.disabled = false;
    resendBtn.disabled = true;
    if (flow.request && params.get('sent') !== '1') {
      try { await requestCode(flow.request); }
      catch (err) { showError(err.message); }
    }
  });
  resendBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopImmediatePropagation();
    clearError(); resendBtn.disabled = true;
    try {
      if (!(await linkReady)) return;
      const canContinue = await requestCode(flow.resend);
      if (!canContinue) return;
      secondsLeft = 300; timerWrap.classList.remove('expired'); vSubmit.disabled = false;
      resendWait = 30; resendBtn.textContent = 'Resend code (30s)';
      const retry = setInterval(() => { resendWait--; if (resendWait <= 0) { clearInterval(retry); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; } else resendBtn.textContent = 'Resend code (' + resendWait + 's)'; }, 1000);
    } catch (err) { showError(err.message); resendBtn.disabled = false; }
  }, true);
  document.getElementById('codeForm').addEventListener('submit', async (e) => {
    e.preventDefault(); e.stopImmediatePropagation(); clearError();
    if (!(await linkReady)) return;
    const code = digits.map((d) => d.value).join('');
    if (code.length !== 6) { showError('Enter all 6 digits.'); return; }
    vSubmit.disabled = true; vSubmit.textContent = 'Verifying…';
    try {
      let body = flow.confirm[1](code);
      if (purpose === 'trust_device_add') {
        const statusResponse = await fetch('/api/devices/trust/face-required', { credentials: 'same-origin' });
        const faceStatus = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(faceStatus.error || 'Could not check Face ID requirements.');
        if (faceStatus.required) {
          const face = await import('/face-scan.js');
          const capture = await face.captureFaceDescriptor({ returnSamples: true });
          body.faceDescriptor = capture.samples?.length ? capture.samples.map((v) => ({ v })) : capture.descriptor;
        }
      }
      const result = await postJSON(flow.confirm[0], body);
      await postJSON('/api/otp-verification-link/consume', { link: linkToken });
      if (purpose === 'password_reset') {
        window.location.assign('/account?resetToken=' + encodeURIComponent(result.resetToken));
      } else if (purpose === 'delete_account') {
        showSuccess('Account deletion confirmed. Returning to sign in…');
        setTimeout(() => window.location.assign('/login?deleted=1'), 900);
      } else {
        showSuccess(purpose === 'card_action' ? 'Security code confirmed. Return and re-enter the action with a fresh anti-bot check.' : 'Verification complete. Returning to the original page…');
        setTimeout(() => window.location.assign(safeReturnTo), 1300);
      }
    } catch (err) { showError(err.message); vSubmit.disabled = false; vSubmit.textContent = 'Verify'; }
  }, true);
}
</script>
</body>
</html>`;
}
