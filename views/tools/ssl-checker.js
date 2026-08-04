import { renderToolPage } from "./page-shell.js";

export function renderSslChecker(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSslChecker",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`,
    heading: "SSL Certificate Checker",
    subtitle: "Check a domain's TLS certificate: issuer, expiry and validity.",
    bodyHtml: `
      <div class="field">
        <label for="domainInput">Domain</label>
        <input type="text" id="domainInput" placeholder="example.com" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var domainInput = document.getElementById('domainInput');
      setExtraValid(false);
      domainInput.addEventListener('input', function(){ setExtraValid(domainInput.value.trim().length > 0); });

      function nameOf(obj){ return obj && (obj.CN || obj.O || JSON.stringify(obj)) || '-'; }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Checking…';
        try {
          var d = await postTool('/api/tools/ssl-check', { domain: domainInput.value.trim() });
          var rows = [
            ['Domain', d.domain],
            ['Subject', nameOf(d.subject)],
            ['Issuer', nameOf(d.issuer)],
            ['Valid From', d.validFrom],
            ['Valid To', d.validTo],
            ['Days Remaining', d.daysRemaining],
            ['Trusted Chain', d.authorized ? 'Yes' : 'No (' + (d.authorizationError || 'not trusted') + ')'],
            ['Fingerprint (SHA-256)', d.fingerprint || '-'],
          ];
          resultEl.innerHTML = '<div class="result-head"><span>Certificate</span></div>' +
            '<table class="result-table">' + rows.map(function(r){
              return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
            }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Check Certificate';
        resetAltcha();
      });`,
  });
}
