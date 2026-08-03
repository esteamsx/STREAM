import { renderToolPage } from "./page-shell.js";

export function renderUuidGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsUuidGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="8" rx="2"/><path stroke-linecap="round" d="M7 8v8M12 8v8M17 8v8"/></svg>`,
    heading: "UUID Generator",
    subtitle: "Generate RFC 4122 v4 UUIDs.",
    bodyHtml: `
      <div class="field">
        <label for="countInput">How many? (1-50)</label>
        <input type="text" id="countInput" value="5" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var countInput = document.getElementById('countInput');
      setExtraValid(true);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/uuid', { count: Number(countInput.value) });
          var joined = data.uuids.join('\\n');
          resultEl.innerHTML = '<div class="result-head"><span>' + data.uuids.length + ' UUID' + (data.uuids.length === 1 ? '' : 's') + '</span><button class="copy-btn" id="copyResultBtn" type="button">Copy All</button></div>' +
            '<pre class="result-pre">' + esc(joined) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(joined).catch(function(){});
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
