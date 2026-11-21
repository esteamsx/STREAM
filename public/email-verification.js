(() => {
  let active = null;
  let shell;
  let resendTimer = null;

  function ensureShell() {
    if (shell) return shell;
    const style = document.createElement('style');
    style.textContent = `
      .es-verify-backdrop{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,6,14,.64);backdrop-filter:blur(18px) saturate(1.25)}
      .es-verify-backdrop.show{display:flex;animation:esVerifyFade .18s ease-out}
      .es-verify-card{width:min(410px,100%);padding:24px;border:1px solid var(--border-strong,rgba(255,255,255,.16));border-radius:22px;background:linear-gradient(145deg,rgba(27,31,45,.87),rgba(14,17,27,.82));box-shadow:0 28px 90px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.09);color:var(--text,#f3f3fa);font-family:var(--font-body,Inter,system-ui,sans-serif)}
      :root[data-theme="light"] .es-verify-backdrop{background:rgba(20,24,38,.36)}
      :root[data-theme="light"] .es-verify-card{background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(244,246,251,.91));box-shadow:0 28px 80px rgba(28,39,67,.22),inset 0 1px 0 rgba(255,255,255,.95)}
      .es-verify-icon{width:46px;height:46px;margin:0 auto 13px;display:grid;place-items:center;border-radius:15px;color:var(--accent,#00e0ff);background:rgba(0,224,255,.1);border:1px solid rgba(0,224,255,.22)}
      .es-verify-icon svg{width:23px;height:23px}
      .es-verify-title{text-align:center;font-family:var(--font-display,var(--font-body,Inter,sans-serif));font-weight:800;font-size:1.13rem;letter-spacing:-.02em}
      .es-verify-intro{text-align:center;color:var(--muted,rgba(255,255,255,.56));font-size:.82rem;line-height:1.55;margin:7px 0 17px}
      .es-verify-digits{display:flex;gap:8px;justify-content:center;margin:15px 0}
      .es-verify-digits input{width:46px;height:54px;border-radius:12px;border:1px solid var(--border-strong,rgba(255,255,255,.15));background:rgba(255,255,255,.045);color:var(--text,#f3f3fa);font:700 1.2rem var(--font-mono,monospace);text-align:center;outline:none}
      :root[data-theme="light"] .es-verify-digits input{background:rgba(255,255,255,.78)}
      .es-verify-digits input:focus{border-color:var(--accent,#00e0ff);box-shadow:0 0 0 3px rgba(0,224,255,.14)}
      .es-verify-msg{min-height:20px;margin:6px 0 10px;text-align:center;color:var(--muted,#aaa);font-size:.78rem;line-height:1.45}
      .es-verify-msg.error{color:var(--red,#ff526f)}
      .es-verify-msg.success{color:var(--green,#12c48b)}
      .es-verify-btn{width:100%;min-height:44px;border:0;border-radius:12px;background:linear-gradient(120deg,var(--accent,#00e0ff),var(--accent2,#7c5cff));color:#07121d;font:800 .86rem var(--font-body,Inter,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,224,255,.18)}
      .es-verify-btn:disabled{opacity:.55;cursor:not-allowed}
      .es-verify-secondary{display:block;width:100%;margin-top:11px;padding:7px;border:0;background:transparent;color:var(--muted,rgba(255,255,255,.55));font:600 .78rem var(--font-body,Inter,system-ui,sans-serif)}
      .es-verify-link{display:none;margin:0 auto 12px;color:var(--accent,#00e0ff);font-size:.8rem;font-weight:700;text-align:center;text-decoration:none}
      .es-verify-link:hover{text-decoration:underline}
      @keyframes esVerifyFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:420px){.es-verify-card{padding:20px}.es-verify-digits{gap:6px}.es-verify-digits input{width:42px;height:50px}}
      @media(prefers-reduced-motion:reduce){.es-verify-backdrop.show{animation:none}}
    `;
    document.head.appendChild(style);
    shell = document.createElement('div');
    shell.className = 'es-verify-backdrop';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-labelledby', 'esVerifyTitle');
    shell.innerHTML = `
      <div class="es-verify-card">
        <div class="es-verify-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path stroke-linecap="round" stroke-linejoin="round" d="m4 7 8 6 8-6"/></svg></div>
        <div class="es-verify-title" id="esVerifyTitle">Verify your email</div>
        <div class="es-verify-intro" id="esVerifyIntro">Confirm that you own the email on your account to continue.</div>
        <a class="es-verify-link" id="esVerifyAddLink" href="/account#addEmail">Add an email to your account</a>
        <div class="es-verify-digits" aria-label="Six-digit verification code">
          <input maxlength="1" inputmode="numeric" autocomplete="one-time-code" aria-label="Digit 1">
          <input maxlength="1" inputmode="numeric" aria-label="Digit 2">
          <input maxlength="1" inputmode="numeric" aria-label="Digit 3">
          <input maxlength="1" inputmode="numeric" aria-label="Digit 4">
          <input maxlength="1" inputmode="numeric" aria-label="Digit 5">
          <input maxlength="1" inputmode="numeric" aria-label="Digit 6">
        </div>
        <div class="es-verify-msg" id="esVerifyMsg" role="status" aria-live="polite"></div>
        <button class="es-verify-btn" id="esVerifyConfirm" type="button">Verify email & continue</button>
        <button class="es-verify-secondary" id="esVerifyResend" type="button" disabled>Resend code (30s)</button>
        <button class="es-verify-secondary" id="esVerifyCancel" type="button">Cancel</button>
      </div>`;
    document.body.appendChild(shell);

    const digits = Array.from(shell.querySelectorAll('.es-verify-digits input'));
    digits.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '').slice(-1);
        if (input.value && digits[index + 1]) digits[index + 1].focus();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && digits[index - 1]) digits[index - 1].focus();
        if (event.key === 'Enter') shell.querySelector('#esVerifyConfirm').click();
      });
      input.addEventListener('paste', (event) => {
        event.preventDefault();
        const code = (event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        code.split('').forEach((digit, i) => { if (digits[i]) digits[i].value = digit; });
        if (digits[Math.min(code.length, digits.length) - 1]) digits[Math.min(code.length, digits.length) - 1].focus();
      });
    });
    shell.querySelector('#esVerifyConfirm').addEventListener('click', confirmCode);
    shell.querySelector('#esVerifyResend').addEventListener('click', requestCode);
    shell.querySelector('#esVerifyCancel').addEventListener('click', () => close(false));
    shell.addEventListener('click', (event) => { if (event.target === shell) close(false); });
    return shell;
  }

  function setMessage(text, kind) {
    const node = shell.querySelector('#esVerifyMsg');
    node.textContent = text || '';
    node.className = 'es-verify-msg' + (kind ? ' ' + kind : '');
  }

  async function post(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { code: data.code || '', status: response.status });
    return data;
  }

  function startCooldown() {
    const button = shell.querySelector('#esVerifyResend');
    if (resendTimer) clearInterval(resendTimer);
    let remaining = 30;
    button.disabled = true;
    button.textContent = `Resend code (${remaining}s)`;
    resendTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0 || !active) {
        clearInterval(resendTimer);
        resendTimer = null;
        button.disabled = false;
        button.textContent = 'Resend code';
      } else button.textContent = `Resend code (${remaining}s)`;
    }, 1000);
  }

  async function requestCode() {
    if (!active) return;
    const resend = shell.querySelector('#esVerifyResend');
    resend.disabled = true;
    try {
      const result = await post('/api/email-verification/request');
      if (result.alreadyVerified) return finishVerification();
      const intro = shell.querySelector('#esVerifyIntro');
      intro.textContent = result.email ? `A six-digit code was sent to ${result.email}.` : 'A six-digit code was sent to the email on your account.';
      shell.querySelector('#esVerifyAddLink').style.display = 'none';
      setMessage('Check your inbox and enter the code below.');
      startCooldown();
    } catch (error) {
      if (error.code === 'EMAIL_REQUIRED') {
        shell.querySelector('#esVerifyIntro').textContent = 'Add an email address to your existing account before continuing. Your account and data will stay the same.';
        shell.querySelector('#esVerifyAddLink').style.display = 'block';
      }
      setMessage(error.message, 'error');
      resend.disabled = false;
    }
  }

  async function confirmCode() {
    if (!active) return;
    const button = shell.querySelector('#esVerifyConfirm');
    const code = Array.from(shell.querySelectorAll('.es-verify-digits input')).map((input) => input.value).join('');
    if (code.length !== 6) return setMessage('Enter all six digits.', 'error');
    button.disabled = true;
    button.textContent = 'Verifying…';
    try {
      await post('/api/email-verification/confirm', { code });
      await finishVerification();
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      if (active) {
        button.disabled = false;
        button.textContent = 'Verify email & continue';
      }
    }
  }

  async function finishVerification() {
    if (!active) return;
    const state = active;
    active = null;
    shell.classList.remove('show');
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = null;
    try {
      const result = await state.onVerified?.();
      state.resolve(result);
    } catch (error) {
      state.reject(error);
    }
  }

  function close(verified) {
    if (!active) return;
    const state = active;
    active = null;
    shell.classList.remove('show');
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = null;
    if (verified) state.resolve();
    else state.reject(Object.assign(new Error('Email verification was cancelled.'), { code: 'EMAIL_VERIFICATION_CANCELLED' }));
  }

  window.ESTEmailVerification = {
    require({ email = '', onVerified } = {}) {
      if (active) return Promise.reject(new Error('Email verification is already open.'));
      ensureShell();
      shell.querySelectorAll('.es-verify-digits input').forEach((input) => { input.value = ''; });
      shell.querySelector('#esVerifyIntro').textContent = email ? `Confirm ownership of ${email} to continue.` : 'Confirm that you own the email on your account to continue.';
      shell.querySelector('#esVerifyAddLink').style.display = 'none';
      shell.querySelector('#esVerifyConfirm').disabled = false;
      shell.querySelector('#esVerifyConfirm').textContent = 'Verify email & continue';
      setMessage('');
      shell.classList.add('show');
      return new Promise((resolve, reject) => {
        active = { resolve, reject, onVerified };
        requestCode();
      });
    },
  };
})();
