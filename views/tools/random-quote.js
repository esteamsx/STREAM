import { renderToolPage } from "./page-shell.js";

export function renderRandomQuote(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsRandomQuote",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8a3 3 0 00-3 3v2a3 3 0 003 3h1v3l-3-1M17 8a3 3 0 00-3 3v2a3 3 0 003 3h1v3l-3-1"/></svg>`,
    heading: "Random Quote Generator",
    subtitle: "Get an inspiring quote whenever you need one.",
    bodyHtml: `<div id="quoteBox" style="text-align:center;color:var(--muted);font-size:.85rem;padding:10px 0 4px">Tap the button below for a quote.</div>`,
    script: `
      setExtraValid(true);
      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Fetching…';
        try {
          var data = await postTool('/api/tools/random-quote', {});
          resultEl.innerHTML = '<blockquote style="font-size:1.05rem;font-family:var(--font-display);line-height:1.6;text-align:center;padding:8px 4px">"' + esc(data.text) + '"</blockquote>' +
            '<div style="text-align:center;color:var(--muted);font-size:.8rem;margin-top:8px">by ' + esc(data.author) + '</div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get Quote';
        resetAltcha();
      });`,
  });
}
