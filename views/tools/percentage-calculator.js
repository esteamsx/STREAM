import { renderToolPage } from "./page-shell.js";

export function renderPercentageCalculator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsPercentageCalculator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path stroke-linecap="round" d="M19 5L5 19"/></svg>`,
    heading: "Percentage Calculator",
    subtitle: "Work out percentages, percentage-of, and percentage change.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Calculation</label>
        <select id="modeSelect">
          <option value="percentOf">X% of Y</option>
          <option value="whatPercent">X is what % of Y</option>
          <option value="percentChange">% change from X to Y</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="xInput" id="xLabel">X</label>
          <input type="text" id="xInput" placeholder="e.g. 20" inputmode="decimal">
        </div>
        <div class="field" style="flex:1">
          <label for="yInput" id="yLabel">Y</label>
          <input type="text" id="yInput" placeholder="e.g. 150" inputmode="decimal">
        </div>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var xInput = document.getElementById('xInput');
      var yInput = document.getElementById('yInput');
      var xLabel = document.getElementById('xLabel');
      var yLabel = document.getElementById('yLabel');
      setExtraValid(false);
      function checkValid(){ setExtraValid(xInput.value.trim().length > 0 && yInput.value.trim().length > 0); }
      xInput.addEventListener('input', checkValid);
      yInput.addEventListener('input', checkValid);
      modeSelect.addEventListener('change', function(){
        if (modeSelect.value === 'percentOf') { xLabel.textContent = 'X (%)'; yLabel.textContent = 'Y'; }
        else if (modeSelect.value === 'whatPercent') { xLabel.textContent = 'X'; yLabel.textContent = 'Y'; }
        else { xLabel.textContent = 'From (X)'; yLabel.textContent = 'To (Y)'; }
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Calculating…';
        try {
          var data = await postTool('/api/tools/percentage', { mode: modeSelect.value, x: xInput.value, y: yInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>' + esc(data.label) + '</span></div>' +
            '<pre class="result-pre" style="font-size:1.2rem;text-align:center">' + esc(data.output) + '</pre>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Calculate';
        resetAltcha();
      });`,
  });
}
