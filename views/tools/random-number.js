import { renderToolPage } from "./page-shell.js";

export function renderRandomNumber(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsRandomNumber",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/></svg>`,
    heading: "Random Number Generator",
    subtitle: "Cryptographically random integers within a range.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1"><label for="minInput">Min</label><input type="text" id="minInput" value="1" autocomplete="off"></div>
        <div class="field" style="flex:1"><label for="maxInput">Max</label><input type="text" id="maxInput" value="100" autocomplete="off"></div>
      </div>
      <div class="field">
        <label for="countInput">How many? (1-100)</label>
        <input type="text" id="countInput" value="1" autocomplete="off">
      </div>`,
    script: `
      var minInput = document.getElementById('minInput');
      var maxInput = document.getElementById('maxInput');
      var countInput = document.getElementById('countInput');
      setExtraValid(true);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/random-number', { min: Number(minInput.value), max: Number(maxInput.value), count: Number(countInput.value) });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<pre class="result-pre">' + esc(data.numbers.join(', ')) + '</pre>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
