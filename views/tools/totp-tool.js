import { renderToolPage } from "./page-shell.js";

export function renderTotpTool(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTotpTool",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>`,
    heading: "TOTP Generator / Tester",
    subtitle: "Generate a fresh 2FA secret and code, or check whether a code matches a secret — handy for testing authenticator app integrations.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="generate">Generate New Secret</option>
          <option value="verify">Verify a Code</option>
        </select>
      </div>
      <div id="verifyFields" style="display:none">
        <div class="field">
          <label for="secretInput">Base32 Secret</label>
          <input type="text" id="secretInput" style="font-family:var(--font-mono)">
        </div>
        <div class="field">
          <label for="tokenInput">6-digit Code</label>
          <input type="text" id="tokenInput" inputmode="numeric" maxlength="6">
        </div>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var verifyFields = document.getElementById('verifyFields');
      var secretInput = document.getElementById('secretInput');
      var tokenInput = document.getElementById('tokenInput');
      setExtraValid(true);
      function checkValid(){
        setExtraValid(modeSelect.value === 'generate' || (secretInput.value.trim().length > 0 && tokenInput.value.trim().length > 0));
      }
      secretInput.addEventListener('input', checkValid);
      tokenInput.addEventListener('input', checkValid);
      modeSelect.addEventListener('change', function(){
        verifyFields.style.display = modeSelect.value === 'verify' ? 'block' : 'none';
        checkValid();
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        var verifying = modeSelect.value === 'verify';
        submitBtn.innerHTML = '<span class="btn-spinner"></span>' + (verifying ? 'Checking…' : 'Generating…');
        try {
          var data = await postTool('/api/tools/totp', { mode: modeSelect.value, secret: secretInput.value, token: tokenInput.value });
          if (verifying) {
            resultEl.innerHTML = '<div class="result-head"><span>Result</span></div><p style="font-size:.95rem;font-weight:700;color:' + (data.valid ? 'var(--green)' : 'var(--red)') + '">' + (data.valid ? 'Valid code.' : 'Invalid or expired code.') + '</p>';
          } else {
            resultEl.innerHTML = '<div class="result-head"><span>New Secret</span></div>' +
              '<table class="result-table"><tr><td>Secret (Base32)</td><td style="font-family:var(--font-mono)">' + esc(data.secret) + '</td></tr>' +
              '<tr><td>Current Code</td><td style="font-family:var(--font-mono);font-size:1.1rem">' + esc(data.code) + '</td></tr>' +
              '<tr><td>Refreshes Every</td><td>' + data.period + 's</td></tr></table>' +
              '<p class="usage-note" style="margin-top:12px">Add the secret to any authenticator app (Google Authenticator, Authy) to test it live.</p>';
          }
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = verifying ? 'Verify' : 'Generate';
        resetAltcha();
      });`,
  });
}
