import { renderToolPage } from "./page-shell.js";

export function renderAsciiArt(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsAsciiArt",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h6"/></svg>`,
    heading: "ASCII Art Banner Generator",
    subtitle: "Turn short text into big block-letter banner art.",
    bodyHtml: `
      <div class="field">
        <label for="textInput">Text (up to 20 characters)</label>
        <input type="text" id="textInput" maxlength="20" placeholder="HELLO">
      </div>`,
    script: `
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Drawing…';
        try {
          var data = await postTool('/api/tools/ascii-art', { text: textInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre" style="font-size:.62rem;line-height:1.3">' + esc(data.output) + '</pre>';
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
