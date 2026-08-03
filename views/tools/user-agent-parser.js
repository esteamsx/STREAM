import { renderToolPage } from "./page-shell.js";

export function renderUserAgentParser(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsUserAgentParser",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="12" rx="2"/><path stroke-linecap="round" d="M9 21h6M12 15v6"/></svg>`,
    heading: "User Agent Parser",
    subtitle: "Break down a browser's User-Agent string into browser, OS and device.",
    bodyHtml: `
      <div class="field">
        <label for="uaInput">User Agent</label>
        <textarea id="uaInput" rows="4" placeholder="Paste a User-Agent string, or leave blank to use your own" spellcheck="false"></textarea>
      </div>`,
    script: `
      var uaInput = document.getElementById('uaInput');
      uaInput.value = navigator.userAgent;
      setExtraValid(true);
      uaInput.addEventListener('input', function(){ setExtraValid(uaInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Parsing…';
        try {
          var data = await postTool('/api/tools/user-agent-parse', { userAgent: uaInput.value.trim() });
          var rows = [['Browser', data.browser + (data.browserVersion ? ' ' + data.browserVersion : '')], ['OS', data.os], ['Device', data.device]];
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Parse';
        resetAltcha();
      });`,
  });
}
