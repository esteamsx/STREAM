import { renderToolPage } from "./page-shell.js";

export function renderBmiCalculator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsBmiCalculator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3.5 2"/></svg>`,
    heading: "BMI Calculator",
    subtitle: "Body Mass Index from your height and weight, metric or imperial.",
    bodyHtml: `
      <div class="field">
        <label for="unitSelect">Units</label>
        <select id="unitSelect">
          <option value="metric">Metric (kg / cm)</option>
          <option value="imperial">Imperial (lb / in)</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="weightInput" id="weightLabel">Weight (kg)</label>
          <input type="text" id="weightInput" placeholder="e.g. 70" inputmode="decimal">
        </div>
        <div class="field" style="flex:1">
          <label for="heightInput" id="heightLabel">Height (cm)</label>
          <input type="text" id="heightInput" placeholder="e.g. 175" inputmode="decimal">
        </div>
      </div>`,
    script: `
      var unitSelect = document.getElementById('unitSelect');
      var weightInput = document.getElementById('weightInput');
      var heightInput = document.getElementById('heightInput');
      var weightLabel = document.getElementById('weightLabel');
      var heightLabel = document.getElementById('heightLabel');
      setExtraValid(false);
      function checkValid(){ setExtraValid(weightInput.value.trim().length > 0 && heightInput.value.trim().length > 0); }
      weightInput.addEventListener('input', checkValid);
      heightInput.addEventListener('input', checkValid);
      unitSelect.addEventListener('change', function(){
        var metric = unitSelect.value === 'metric';
        weightLabel.textContent = metric ? 'Weight (kg)' : 'Weight (lb)';
        heightLabel.textContent = metric ? 'Height (cm)' : 'Height (in)';
        weightInput.placeholder = metric ? 'e.g. 70' : 'e.g. 154';
        heightInput.placeholder = metric ? 'e.g. 175' : 'e.g. 69';
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Calculating…';
        try {
          var data = await postTool('/api/tools/bmi', { unit: unitSelect.value, weight: weightInput.value, height: heightInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table"><tr><td>BMI</td><td>' + esc(data.bmi) + '</td></tr><tr><td>Category</td><td>' + esc(data.category) + '</td></tr></table>';
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
