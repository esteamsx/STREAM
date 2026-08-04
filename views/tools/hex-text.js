import { renderToolPage } from "./page-shell.js";

export function renderHexText(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsHexText",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h2m2 0h2m2 0h2M7 15h10"/></svg>`,
    heading: "Hex ↔ Text Converter",
    subtitle: "Convert text to hexadecimal and back.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="toHex">Text → Hex</option>
          <option value="fromHex">Hex → Text</option>
        </select>
      </div>
      <div class="field">
        <label for="textInput">Input</label>
        <textarea id="textInput" rows="6" placeholder="Type text or hex here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/hex-text', { text: textInput.value, mode: modeSelect.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
