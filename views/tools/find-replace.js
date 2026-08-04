import { renderToolPage } from "./page-shell.js";

export function renderFindReplace(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsFindReplace",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>`,
    heading: "Find & Replace",
    subtitle: "Find and replace text across a block, with optional regex and case sensitivity.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="findInput">Find</label>
          <input type="text" id="findInput" placeholder="Text to find…">
        </div>
        <div class="field" style="flex:1">
          <label for="replaceInput">Replace with</label>
          <input type="text" id="replaceInput" placeholder="Replacement…">
        </div>
      </div>
      <div class="field-row" style="margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="useRegex" style="width:auto"> Use regex</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="caseSensitive" style="width:auto"> Case sensitive</label>
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="9" placeholder="Paste your text here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var findInput = document.getElementById('findInput');
      var replaceInput = document.getElementById('replaceInput');
      var useRegex = document.getElementById('useRegex');
      var caseSensitive = document.getElementById('caseSensitive');
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      function checkValid(){ setExtraValid(textInput.value.length > 0 && findInput.value.length > 0); }
      textInput.addEventListener('input', checkValid);
      findInput.addEventListener('input', checkValid);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Replacing…';
        try {
          var data = await postTool('/api/tools/find-replace', {
            text: textInput.value, find: findInput.value, replace: replaceInput.value,
            useRegex: useRegex.checked, caseSensitive: caseSensitive.checked,
          });
          resultEl.innerHTML = '<div class="result-head"><span>' + data.count + ' replacement' + (data.count === 1 ? '' : 's') + '</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Replace';
        resetAltcha();
      });`,
  });
}
