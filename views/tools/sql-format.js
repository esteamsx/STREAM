import { renderToolPage } from "./page-shell.js";

export function renderSqlFormat(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSqlFormat",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`,
    heading: "SQL Formatter",
    subtitle: "Paste a messy SQL query and get back a readable, indented version with keywords on their own lines.",
    bodyHtml: `
      <div class="field">
        <label for="sqlInput">SQL Query</label>
        <textarea id="sqlInput" rows="9" placeholder="select id, name from users where active = 1 order by name" spellcheck="false"></textarea>
      </div>`,
    script: `
      var sqlInput = document.getElementById('sqlInput');
      setExtraValid(false);
      sqlInput.addEventListener('input', function(){ setExtraValid(sqlInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Formatting…';
        try {
          var data = await postTool('/api/tools/sql-format', { sql: sqlInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Formatted SQL</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Format';
        resetAltcha();
      });`,
  });
}
