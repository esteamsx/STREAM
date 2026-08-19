import { renderToolPage } from "./page-shell.js";

export function renderTipCalculator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTipCalculator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    heading: "Tip Calculator",
    subtitle: "Work out the tip, total bill, and how much each person owes.",
    bodyHtml: `
      <div class="field">
        <label for="billInput">Bill Amount</label>
        <input type="text" id="billInput" placeholder="e.g. 85.50" inputmode="decimal">
      </div>
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="tipInput">Tip %</label>
          <input type="text" id="tipInput" value="15" inputmode="numeric">
        </div>
        <div class="field" style="flex:1">
          <label for="peopleInput">Split Between</label>
          <input type="text" id="peopleInput" value="1" inputmode="numeric">
        </div>
      </div>`,
    script: `
      var billInput = document.getElementById('billInput');
      var tipInput = document.getElementById('tipInput');
      var peopleInput = document.getElementById('peopleInput');
      setExtraValid(false);
      billInput.addEventListener('input', function(){ setExtraValid(billInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Calculating…';
        try {
          var data = await postTool('/api/tools/tip-calculator', { bill: billInput.value, tipPercent: tipInput.value, people: peopleInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' +
            '<tr><td>Tip Amount</td><td>' + esc(data.tipAmount) + '</td></tr>' +
            '<tr><td>Total Bill</td><td>' + esc(data.total) + '</td></tr>' +
            '<tr><td>Per Person (Total)</td><td>' + esc(data.perPersonTotal) + '</td></tr>' +
            '<tr><td>Per Person (Tip Only)</td><td>' + esc(data.perPersonTip) + '</td></tr>' +
            '</table>';
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
