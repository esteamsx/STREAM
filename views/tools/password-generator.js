import { renderToolPage } from "./page-shell.js";

export function renderPasswordGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsPasswordGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    heading: "Password Generator",
    subtitle: "Cryptographically random passwords, generated fresh each time — nothing is stored.",
    bodyHtml: `
      <div class="field">
        <label for="lengthInput">Length: <span id="lengthValue">16</span></label>
        <input type="range" id="lengthInput" min="4" max="64" value="16" style="width:100%">
      </div>
      <div class="field" style="display:flex;flex-wrap:wrap;gap:14px">
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="setUpper" checked> Uppercase</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="setLower" checked> Lowercase</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="setNumbers" checked> Numbers</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="setSymbols" checked> Symbols</label>
      </div>`,
    extraStyle: `
      .pw-result{font-family:var(--font-mono);font-size:1.15rem;word-break:break-all;background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
      .pw-strength{font-size:.72rem;color:var(--muted);margin-top:8px}
    `,
    script: `
      var lengthInput = document.getElementById('lengthInput');
      var lengthValue = document.getElementById('lengthValue');
      var setUpper = document.getElementById('setUpper');
      var setLower = document.getElementById('setLower');
      var setNumbers = document.getElementById('setNumbers');
      var setSymbols = document.getElementById('setSymbols');
      setExtraValid(true);
      lengthInput.addEventListener('input', function(){ lengthValue.textContent = lengthInput.value; });

      function strengthLabel(bits){
        if (bits < 40) return 'Weak';
        if (bits < 60) return 'Fair';
        if (bits < 80) return 'Strong';
        return 'Very Strong';
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!setUpper.checked && !setLower.checked && !setNumbers.checked && !setSymbols.checked) {
          showMsg('Pick at least one character type.', false);
          return;
        }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/password-generate', {
            length: Number(lengthInput.value),
            sets: { uppercase: setUpper.checked, lowercase: setLower.checked, numbers: setNumbers.checked, symbols: setSymbols.checked },
          });
          resultEl.innerHTML = '<div class="result-head"><span>Password</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<div class="pw-result">' + esc(data.password) + '</div>' +
            '<div class="pw-strength">' + data.entropyBits + ' bits of entropy — ' + strengthLabel(data.entropyBits) + '</div>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.password).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
