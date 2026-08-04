import { renderToolPage } from "./page-shell.js";

export function renderCaseConverter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsCaseConverter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 20l4-14 4 14M5.5 15h5M14 20V6h4a3 3 0 010 6h-4"/></svg>`,
    heading: "Case Converter",
    subtitle: "Switch text between UPPER, lower, Title, camelCase, snake_case, kebab-case and PascalCase.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Case</label>
        <select id="modeSelect">
          <option value="upper">UPPERCASE</option>
          <option value="lower">lowercase</option>
          <option value="title">Title Case</option>
          <option value="camel">camelCase</option>
          <option value="pascal">PascalCase</option>
          <option value="snake">snake_case</option>
          <option value="kebab">kebab-case</option>
        </select>
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="7" placeholder="Type or paste text here…" spellcheck="false"></textarea>
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
          var data = await postTool('/api/tools/case-convert', { text: textInput.value, mode: modeSelect.value });
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
