import { renderToolPage } from "./page-shell.js";

export function renderAgeCalculator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsAgeCalculator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 10h18M8 3v4M16 3v4"/></svg>`,
    heading: "Age Calculator",
    subtitle: "Enter a birth date to see the exact age in years, months and days.",
    bodyHtml: `
      <div class="field">
        <label for="dateInput">Birth Date</label>
        <input type="date" id="dateInput">
      </div>`,
    script: `
      var dateInput = document.getElementById('dateInput');
      setExtraValid(false);
      dateInput.addEventListener('input', function(){ setExtraValid(dateInput.value.length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Calculating…';
        try {
          var data = await postTool('/api/tools/age-calc', { birthDate: dateInput.value });
          var rows = [['Years', data.years], ['Months', data.months], ['Days', data.days], ['Total Days Alive', data.totalDays]];
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
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
