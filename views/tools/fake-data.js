import { renderToolPage } from "./page-shell.js";

export function renderFakeData(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsFakeData",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path stroke-linecap="round" d="M3.5 20a5.5 5.5 0 0111 0M16 8.5a3 3 0 010 6M20.5 20a5 5 0 00-6-4.9"/></svg>`,
    heading: "Fake Data Generator",
    subtitle: "Generate realistic-looking fake names, emails and addresses for testing forms.",
    bodyHtml: `
      <div class="field">
        <label for="countInput">How many records? (1–50)</label>
        <input type="text" id="countInput" value="5" inputmode="numeric">
      </div>`,
    script: `
      var countInput = document.getElementById('countInput');
      setExtraValid(true);
      countInput.addEventListener('input', function(){ setExtraValid(/^[0-9]+$/.test(countInput.value.trim())); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/fake-data', { count: countInput.value });
          var json = JSON.stringify(data.people, null, 2);
          var rows = data.people.map(function(p){
            return '<tr><td>' + esc(p.firstName + ' ' + p.lastName) + '</td><td>' + esc(p.email) + '</td><td>' + esc(p.phone) + '</td><td>' + esc(p.address) + '</td><td>' + esc(p.company) + '</td></tr>';
          }).join('');
          resultEl.innerHTML = '<div class="result-head"><span>' + data.people.length + ' record' + (data.people.length === 1 ? '' : 's') + '</span><button class="copy-btn" id="copyResultBtn" type="button">Copy JSON</button></div>' +
            '<div style="overflow-x:auto"><table class="result-table" style="white-space:nowrap"><tr><td><b>Name</b></td><td><b>Email</b></td><td><b>Phone</b></td><td><b>Address</b></td><td><b>Company</b></td></tr>' + rows + '</table></div>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(json).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
