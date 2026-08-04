import { renderToolPage } from "./page-shell.js";

export function renderNumberToWords(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsNumberToWords",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 20l4-14 4 14M5.5 15h5M14 20V6h4a3 3 0 010 6h-4"/></svg>`,
    heading: "Number ⇄ Words Converter",
    subtitle: "Turn a number into words, or spelled-out words back into a number.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Direction</label>
        <select id="modeSelect">
          <option value="toWords">Number → Words</option>
          <option value="toNumber">Words → Number</option>
        </select>
      </div>
      <div class="field">
        <label for="inputField">Input</label>
        <input type="text" id="inputField" placeholder="e.g. 1204 or one thousand two hundred four">
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var inputField = document.getElementById('inputField');
      setExtraValid(false);
      inputField.addEventListener('input', function(){ setExtraValid(inputField.value.trim().length > 0); });
      modeSelect.addEventListener('change', function(){
        inputField.placeholder = modeSelect.value === 'toWords' ? 'e.g. 1204' : 'e.g. one thousand two hundred four';
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/number-to-words', { mode: modeSelect.value, input: inputField.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div><pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
