import { renderToolPage } from "./page-shell.js";

export function renderHttpHeaders(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsHttpHeaders",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h10M7 17h6"/></svg>`,
    heading: "HTTP Headers Inspector",
    subtitle: "See the response headers a site sends back — server, caching, security headers and more.",
    bodyHtml: `
      <div class="field">
        <label for="urlInput">URL</label>
        <input type="text" id="urlInput" placeholder="example.com">
      </div>`,
    script: `
      var urlInput = document.getElementById('urlInput');
      setExtraValid(false);
      urlInput.addEventListener('input', function(){ setExtraValid(urlInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Fetching…';
        try {
          var data = await postTool('/api/tools/http-headers', { url: urlInput.value });
          var rows = Object.keys(data.headers).sort().map(function(k){
            return '<tr><td>' + esc(k) + '</td><td>' + esc(data.headers[k]) + '</td></tr>';
          }).join('');
          resultEl.innerHTML = '<div class="result-head"><span>' + data.status + ' ' + esc(data.statusText) + '</span></div>' +
            '<div style="overflow-x:auto"><table class="result-table">' + rows + '</table></div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Inspect';
        resetAltcha();
      });`,
  });
}
