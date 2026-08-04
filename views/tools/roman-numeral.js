import { renderToolPage } from "./page-shell.js";

export function renderRomanNumeral(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsRomanNumeral",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M5 6v12M9 6v12M13 6l4 12M20 6l-4 12"/></svg>`,
    heading: "Roman Numeral Converter",
    subtitle: "Convert between numbers (1–3999) and Roman numerals.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="toRoman">Number → Roman</option>
          <option value="fromRoman">Roman → Number</option>
        </select>
      </div>
      <div class="field">
        <label for="valInput">Input</label>
        <input type="text" id="valInput" placeholder="1994" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var valInput = document.getElementById('valInput');
      setExtraValid(false);
      modeSelect.addEventListener('change', function(){
        valInput.placeholder = modeSelect.value === 'toRoman' ? '1994' : 'MCMXCIV';
      });
      valInput.addEventListener('input', function(){ setExtraValid(valInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/roman-numeral', { input: valInput.value.trim(), mode: modeSelect.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(String(data.output)).catch(function(){});
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
