import { renderToolPage } from "./page-shell.js";

export function renderDedupeLines(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsDedupeLines",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h11M4 18h11"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 15l-2 2-2-2"/></svg>`,
    heading: "Duplicate Line Remover",
    subtitle: "Remove duplicate lines from a block of text, keeping the first occurrence.",
    bodyHtml: `
      <div class="field" style="display:flex;align-items:center;gap:8px">
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text);margin:0"><input type="checkbox" id="caseSensitive"> Case sensitive</label>
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="9" placeholder="One line per entry…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var textInput = document.getElementById('textInput');
      var caseSensitive = document.getElementById('caseSensitive');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Processing…';
        try {
          var data = await postTool('/api/tools/dedupe-lines', { text: textInput.value, caseSensitive: caseSensitive.checked });
          resultEl.innerHTML = '<div class="result-head"><span>Removed ' + data.removedCount + ' duplicate' + (data.removedCount === 1 ? '' : 's') + '</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Remove Duplicates';
        resetAltcha();
      });`,
  });
}
