import { renderToolPage } from "./page-shell.js";

export function renderSubnetCalculator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSubnetCalculator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path stroke-linecap="round" d="M7 12h5M12 12l5-6M12 12l5 6"/></svg>`,
    heading: "Subnet / CIDR Calculator",
    subtitle: "Enter a CIDR block and get its network range, broadcast address and host count.",
    bodyHtml: `
      <div class="field">
        <label for="cidrInput">CIDR</label>
        <input type="text" id="cidrInput" placeholder="192.168.1.0/24" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var cidrInput = document.getElementById('cidrInput');
      setExtraValid(false);
      cidrInput.addEventListener('input', function(){ setExtraValid(cidrInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Calculating…';
        try {
          var data = await postTool('/api/tools/subnet-calc', { cidr: cidrInput.value.trim() });
          var rows = [
            ['Network', data.network], ['Broadcast', data.broadcast], ['Subnet Mask', data.subnetMask],
            ['First Host', data.firstHost], ['Last Host', data.lastHost],
            ['Total Addresses', data.totalHosts], ['Usable Hosts', data.usableHosts],
          ];
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
