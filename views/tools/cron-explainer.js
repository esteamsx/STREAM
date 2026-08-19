import { renderToolPage } from "./page-shell.js";

export function renderCronExplainer(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsCronExplainer",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>`,
    heading: "Cron Expression Explainer",
    subtitle: "Paste a 5-field cron expression to see what it means and when it'll next run.",
    bodyHtml: `
      <div class="field">
        <label for="cronInput">Cron Expression</label>
        <input type="text" id="cronInput" value="0 9 * * 1-5" style="font-family:var(--font-mono)">
      </div>
      <p class="usage-note" style="margin-top:0;margin-bottom:14px">Format: minute hour day-of-month month day-of-week (e.g. <code style="color:var(--accent)">*/15 * * * *</code> = every 15 minutes)</p>`,
    script: `
      var cronInput = document.getElementById('cronInput');
      setExtraValid(true);
      cronInput.addEventListener('input', function(){ setExtraValid(cronInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Explaining…';
        try {
          var data = await postTool('/api/tools/cron-explain', { expression: cronInput.value });
          var runsHtml = data.nextRuns.map(function(r){ return '<div>' + esc(new Date(r).toUTCString()) + '</div>'; }).join('');
          resultEl.innerHTML = '<div class="result-head"><span>Meaning</span></div>' +
            '<pre class="result-pre" style="margin-bottom:12px">' + esc(data.description) + '</pre>' +
            '<div class="result-head"><span>Next 5 Runs (UTC)</span></div>' +
            '<div style="font-family:var(--font-mono);font-size:.8rem;line-height:1.8;color:var(--text)">' + runsHtml + '</div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Explain';
        resetAltcha();
      });`,
  });
}
