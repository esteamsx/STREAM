import { renderToolPage } from "./page-shell.js";

export function renderPasswordHash(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsPasswordHash",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    heading: "Secure Password Hash",
    subtitle: "Generate a salted scrypt hash for storing passwords, or verify a password against an existing hash. Slower and safer than MD5/SHA for password storage.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="generate">Generate Hash</option>
          <option value="verify">Verify Password</option>
        </select>
      </div>
      <div class="field">
        <label for="passwordInput">Password</label>
        <input type="password" id="passwordInput" autocomplete="off">
      </div>
      <div class="field" id="hashField" style="display:none">
        <label for="hashInput">Stored Hash</label>
        <input type="text" id="hashInput" style="font-family:var(--font-mono)" placeholder="salt:hash">
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var passwordInput = document.getElementById('passwordInput');
      var hashField = document.getElementById('hashField');
      var hashInput = document.getElementById('hashInput');
      setExtraValid(false);
      function checkValid(){
        setExtraValid(passwordInput.value.length > 0 && (modeSelect.value === 'generate' || hashInput.value.trim().length > 0));
      }
      passwordInput.addEventListener('input', checkValid);
      hashInput.addEventListener('input', checkValid);
      modeSelect.addEventListener('change', function(){
        hashField.style.display = modeSelect.value === 'verify' ? 'block' : 'none';
        checkValid();
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        var verifying = modeSelect.value === 'verify';
        submitBtn.innerHTML = '<span class="btn-spinner"></span>' + (verifying ? 'Verifying…' : 'Hashing…');
        try {
          var data = await postTool('/api/tools/password-hash', { mode: modeSelect.value, password: passwordInput.value, hash: hashInput.value });
          if (verifying) {
            resultEl.innerHTML = '<div class="result-head"><span>Result</span></div><p style="font-size:.95rem;font-weight:700;color:' + (data.matches ? 'var(--green)' : 'var(--red)') + '">' + (data.matches ? 'Password matches.' : 'Password does not match.') + '</p>';
          } else {
            resultEl.innerHTML = '<div class="result-head"><span>Hash</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div><pre class="result-pre">' + esc(data.output) + '</pre>';
          }
          showResult();
          var copyBtn = document.getElementById('copyResultBtn');
          if (copyBtn) copyBtn.addEventListener('click', function(){ navigator.clipboard.writeText(data.output).catch(function(){}); });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = verifying ? 'Verify' : 'Generate Hash';
        resetAltcha();
      });`,
  });
}
