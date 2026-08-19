import { renderToolPage } from "./page-shell.js";

export function renderIpLookup(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsIpLookup",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="10" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z"/></svg>`,
    heading: "IP Address Lookup",
    subtitle: "Look up geolocation and ISP info for any IP address, or leave it blank to look up your own.",
    bodyHtml: `
      <div class="field">
        <label for="ipInput">IP Address (optional)</label>
        <input type="text" id="ipInput" placeholder="Leave blank for your own IP">
      </div>`,
    script: `
      setExtraValid(true);
      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Looking up…';
        try {
          var data = await postTool('/api/tools/ip-lookup', { ip: document.getElementById('ipInput').value });
          var rows = [
            ['IP', data.ip], ['City', data.city], ['Region', data.region], ['Country', data.country],
            ['Postal Code', data.postal], ['Timezone', data.timezone], ['ISP', data.isp],
            ['Coordinates', (data.latitude != null ? data.latitude + ', ' + data.longitude : '')],
          ];
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1] || '-') + '</td></tr>'; }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Look Up';
        resetAltcha();
      });`,
  });
}
