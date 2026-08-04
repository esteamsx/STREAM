import { renderToolPage } from "./page-shell.js";

export function renderSitemapXml(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSitemapXml",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M12 3a15 15 0 010 18a15 15 0 010-18"/></svg>`,
    heading: "Sitemap.xml Generator",
    subtitle: "Paste your page URLs (one per line) to generate a valid sitemap.xml file for search engines.",
    bodyHtml: `
      <div class="field">
        <label for="urlsInput">Page URLs</label>
        <textarea id="urlsInput" rows="9" placeholder="https://example.com/&#10;https://example.com/about&#10;https://example.com/contact"></textarea>
      </div>`,
    script: `
      var urlsInput = document.getElementById('urlsInput');
      setExtraValid(false);
      urlsInput.addEventListener('input', function(){ setExtraValid(urlsInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var urls = urlsInput.value.split('\\n').map(function(l){ return l.trim(); }).filter(Boolean);
          var data = await postTool('/api/tools/sitemap-xml', { urls: urls });
          resultEl.innerHTML = '<div class="result-head"><span>sitemap.xml</span><span style="display:flex;gap:6px"><button class="copy-btn" id="copyResultBtn" type="button">Copy</button><button class="copy-btn" id="dlResultBtn" type="button">Download</button></span></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerBlobDownload(data.output, 'sitemap.xml', 'application/xml');
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
