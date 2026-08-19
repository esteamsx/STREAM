import { renderToolPage } from "./page-shell.js";

export function renderDiceRoller(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsDiceRoller",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/></svg>`,
    heading: "Coin Flip / Dice Roller",
    subtitle: "Flip a coin or roll dice with any number of sides.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="sidesSelect">Sides</label>
          <select id="sidesSelect">
            <option value="2">Coin (2)</option>
            <option value="6" selected>D6</option>
            <option value="10">D10</option>
            <option value="12">D12</option>
            <option value="20">D20</option>
            <option value="100">D100</option>
          </select>
        </div>
        <div class="field" style="flex:1"><label for="countInput">Count (1-50)</label><input type="text" id="countInput" value="1" autocomplete="off"></div>
      </div>`,
    script: `
      var sidesSelect = document.getElementById('sidesSelect');
      var countInput = document.getElementById('countInput');
      setExtraValid(true);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Rolling…';
        try {
          var data = await postTool('/api/tools/dice-roll', { sides: Number(sidesSelect.value), count: Number(countInput.value) });
          var labels = sidesSelect.value === '2' ? data.rolls.map(function(n){ return n === 1 ? 'Heads' : 'Tails'; }) : data.rolls;
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<pre class="result-pre">' + esc(labels.join(', ')) + (sidesSelect.value === '2' ? '' : '\\n\\nTotal: ' + data.total) + '</pre>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Roll';
        resetAltcha();
      });`,
  });
}
