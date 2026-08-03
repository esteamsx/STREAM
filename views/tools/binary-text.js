import { renderToolPage } from "./page-shell.js";

export function renderBinaryText(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsBinaryText",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9l3 3-3 3M21 9l-3 3 3 3"/></svg>`,
    heading: "Binary ↔ Text Converter",
    subtitle: "Convert text to binary and back.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="toBinary">Text → Binary</option>
          <option value="fromBinary">Binary → Text</option>
        </select>
      </div>
      <div class="field">
        <label for="textInput">Input</label>
        <textarea id="textInput" rows="6" placeholder="Type text or 8-bit binary groups here…" spellcheck="false"></textarea>
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
          var data = await postTool('/api/tools/binary-text', { text: textInput.value, mode: modeSelect.value });
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
