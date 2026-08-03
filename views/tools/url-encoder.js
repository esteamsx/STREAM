import { renderToolPage } from "./page-shell.js";

export function renderUrlEncoder(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsUrlEncoder",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L13 19"/></svg>`,
    heading: "URL Encoder / Decoder",
    subtitle: "Percent-encode or decode text for safe use in URLs.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="encode">Encode</option>
          <option value="decode">Decode</option>
        </select>
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="6" placeholder="Type or paste text here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Processing…';
        try {
          var data = await postTool('/api/tools/url-encode', { text: textInput.value, mode: modeSelect.value });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Run';
        resetAltcha();
      });`,
  });
}
