import { renderToolPage } from "./page-shell.js";

export function renderBase64(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsBase64",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h4M7 13h6M7 17h3"/></svg>`,
    heading: "Base64 Encode / Decode",
    subtitle: "Encode text to Base64, or decode Base64 back to text.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="encode">Encode (text → Base64)</option>
          <option value="decode">Decode (Base64 → text)</option>
        </select>
      </div>
      <div class="field">
        <label for="inputText">Input</label>
        <textarea id="inputText" rows="6" placeholder="Type or paste here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var inputText = document.getElementById('inputText');
      var modeSelect = document.getElementById('modeSelect');
      setExtraValid(false);
      inputText.addEventListener('input', function(){ setExtraValid(inputText.value.length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Processing…';
        try {
          var data = await postTool('/api/tools/base64', { input: inputText.value, mode: modeSelect.value });
          resultEl.innerHTML = '<div class="result-head"><span>Output</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
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
