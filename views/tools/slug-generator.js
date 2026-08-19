import { renderToolPage } from "./page-shell.js";

export function renderSlugGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSlugGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M6 12h12M6 8h12M6 16h8"/></svg>`,
    heading: "Slug Generator",
    subtitle: "Turn any text into a clean, URL-friendly slug.",
    bodyHtml: `
      <div class="field">
        <label for="textInput">Text</label>
        <input type="text" id="textInput" placeholder="My Awesome Blog Post!" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/slug', { text: textInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Slug</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
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
