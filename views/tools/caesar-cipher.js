import { renderToolPage } from "./page-shell.js";

export function renderCaesarCipher(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsCaesarCipher",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v9l6 3"/></svg>`,
    heading: "ROT13 / Caesar Cipher",
    subtitle: "Shift letters by any amount — defaults to ROT13.",
    bodyHtml: `
      <div class="field">
        <label for="shiftInput">Shift: <span id="shiftValue">13</span></label>
        <input type="range" id="shiftInput" min="0" max="25" value="13" style="width:100%">
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="6" placeholder="Type or paste text here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var shiftInput = document.getElementById('shiftInput');
      var shiftValue = document.getElementById('shiftValue');
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      shiftInput.addEventListener('input', function(){ shiftValue.textContent = shiftInput.value; });
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Processing…';
        try {
          var data = await postTool('/api/tools/caesar-cipher', { text: textInput.value, shift: Number(shiftInput.value) });
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
