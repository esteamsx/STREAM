import { renderToolPage } from "./page-shell.js";

export function renderDnsLookup(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsDnsLookup",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z"/></svg>`,
    heading: "DNS Lookup",
    subtitle: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records for any domain.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:2">
          <label for="domainInput">Domain</label>
          <input type="text" id="domainInput" placeholder="example.com" autocomplete="off" spellcheck="false">
        </div>
        <div class="field" style="flex:1">
          <label for="typeSelect">Type</label>
          <select id="typeSelect">
            <option value="A">A</option>
            <option value="AAAA">AAAA</option>
            <option value="MX">MX</option>
            <option value="TXT">TXT</option>
            <option value="NS">NS</option>
            <option value="CNAME">CNAME</option>
            <option value="SOA">SOA</option>
          </select>
        </div>
      </div>`,
    script: `
      var domainInput = document.getElementById('domainInput');
      var typeSelect = document.getElementById('typeSelect');
      setExtraValid(false);
      domainInput.addEventListener('input', function(){ setExtraValid(domainInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Looking up…';
        try {
          var data = await postTool('/api/tools/dns-lookup', { domain: domainInput.value.trim(), type: typeSelect.value });
          var pretty = JSON.stringify(data.records, null, 2);
          resultEl.innerHTML = '<div class="result-head"><span>' + esc(data.type) + ' Records</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(pretty) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(pretty).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Look Up';
        resetAltcha();
      });`,
  });
}
