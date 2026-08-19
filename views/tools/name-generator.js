import { renderToolPage } from "./page-shell.js";

export function renderNameGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsNameGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/></svg>`,
    heading: "Business Name Generator",
    subtitle: "Get 10 brandable name ideas built from your keyword.",
    bodyHtml: `
      <div class="field">
        <label for="keywordInput">Keyword</label>
        <input type="text" id="keywordInput" placeholder="e.g. stream">
      </div>`,
    script: `
      var keywordInput = document.getElementById('keywordInput');
      setExtraValid(false);
      keywordInput.addEventListener('input', function(){ setExtraValid(keywordInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Brainstorming…';
        try {
          var data = await postTool('/api/tools/name-generator', { keyword: keywordInput.value });
          var items = data.names.map(function(n){ return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-weight:600">' + esc(n) + '</div>'; }).join('');
          resultEl.innerHTML = '<div class="result-head"><span>Ideas</span></div>' + items;
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Names';
        resetAltcha();
      });`,
  });
}
