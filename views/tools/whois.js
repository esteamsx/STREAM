import { renderToolPage } from "./page-shell.js";

export function renderWhois(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsWhois",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>`,
    heading: "WHOIS Lookup",
    subtitle: "Look up domain registration info: owner org, registrar, creation and expiry dates.",
    bodyHtml: `
      <div class="field">
        <label for="domainInput">Domain</label>
        <input type="text" id="domainInput" placeholder="example.com" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var domainInput = document.getElementById('domainInput');
      setExtraValid(false);
      domainInput.addEventListener('input', function(){ setExtraValid(domainInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Looking up…';
        try {
          var data = await postTool('/api/tools/whois', { domain: domainInput.value.trim() });
          resultEl.innerHTML = '<div class="result-head"><span>WHOIS Record</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.raw) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.raw).catch(function(){});
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
