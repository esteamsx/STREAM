import { renderToolPage } from "./page-shell.js";

export function renderMorseCode(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsMorseCode",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1.6"/><circle cx="10" cy="12" r="1.6"/><path stroke-linecap="round" d="M14 12h2M18 12h2"/></svg>`,
    heading: "Morse Code Translator",
    subtitle: "Translate text to Morse code, or Morse code back to text.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Direction</label>
        <select id="modeSelect">
          <option value="toMorse">Text → Morse</option>
          <option value="toText">Morse → Text</option>
        </select>
      </div>
      <div class="field">
        <label for="inputText">Input</label>
        <textarea id="inputText" rows="6" placeholder="SOS" spellcheck="false"></textarea>
      </div>
      <p class="usage-note" style="margin-top:0;margin-bottom:14px">Separate letters with a space, words with " / " when translating Morse → Text.</p>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var inputText = document.getElementById('inputText');
      setExtraValid(false);
      inputText.addEventListener('input', function(){ setExtraValid(inputText.value.trim().length > 0); });
      modeSelect.addEventListener('change', function(){
        inputText.placeholder = modeSelect.value === 'toMorse' ? 'SOS' : '... --- ...';
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Translating…';
        try {
          var data = await postTool('/api/tools/morse-code', { mode: modeSelect.value, input: inputText.value });
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
        submitBtn.textContent = 'Translate';
        resetAltcha();
      });`,
  });
}
