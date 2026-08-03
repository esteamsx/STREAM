import { renderToolPage } from "./tool-page.js";

export function renderJsonFormatter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsJsonFormatter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/></svg>`,
    heading: "JSON Formatter",
    subtitle: "Format and validate JSON — pretty-printed with 2-space indentation.",
    bodyHtml: `
      <div class="field">
        <label for="jsonInput">JSON</label>
        <textarea id="jsonInput" rows="9" placeholder='{"hello":"world"}' spellcheck="false"></textarea>
      </div>`,
    script: `
      var jsonInput = document.getElementById('jsonInput');
      setExtraValid(false);
      jsonInput.addEventListener('input', function(){ setExtraValid(jsonInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Formatting…';
        try {
          var data = await postTool('/api/tools/json-format', { input: jsonInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Formatted</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          showMsg('Valid JSON.', true);
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Format';
        resetAltcha();
      });`,
  });
}
