import { renderToolPage } from "./page-shell.js";

export function renderTextDiff(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTextDiff",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M8 3v18M16 3v18M3 9h5M16 9h5M3 15h5M16 15h5"/></svg>`,
    heading: "Text Diff Checker",
    subtitle: "Compare two blocks of text and see exactly what changed, line by line.",
    bodyHtml: `
      <div class="field">
        <label for="textA">Original</label>
        <textarea id="textA" rows="6" placeholder="Paste the original text…" spellcheck="false"></textarea>
      </div>
      <div class="field">
        <label for="textB">Changed</label>
        <textarea id="textB" rows="6" placeholder="Paste the changed text…" spellcheck="false"></textarea>
      </div>`,
    extraStyle: `
      .diff-line{font-family:var(--font-mono);font-size:.78rem;padding:2px 8px;white-space:pre-wrap;word-break:break-all;border-radius:4px}
      .diff-added{background:rgba(18,196,139,.14);color:var(--green)}
      .diff-removed{background:rgba(255,59,92,.14);color:var(--red);text-decoration:line-through;text-decoration-color:rgba(255,59,92,.5)}
      .diff-same{color:var(--muted)}`,
    script: `
      var textA = document.getElementById('textA');
      var textB = document.getElementById('textB');
      setExtraValid(false);
      function checkValid(){ setExtraValid(textA.value.trim().length > 0 || textB.value.trim().length > 0); }
      textA.addEventListener('input', checkValid);
      textB.addEventListener('input', checkValid);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Comparing…';
        try {
          var data = await postTool('/api/tools/text-diff', { textA: textA.value, textB: textB.value });
          var lines = data.ops.map(function(op){
            var cls = op.type === 'added' ? 'diff-added' : op.type === 'removed' ? 'diff-removed' : 'diff-same';
            var prefix = op.type === 'added' ? '+ ' : op.type === 'removed' ? '- ' : '  ';
            return '<div class="diff-line ' + cls + '">' + esc(prefix + op.text) + '</div>';
          }).join('');
          resultEl.innerHTML = '<div class="result-head"><span>' + data.added + ' added · ' + data.removed + ' removed</span></div>' +
            '<div style="max-height:400px;overflow-y:auto;background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:8px">' + lines + '</div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Compare';
        resetAltcha();
      });`,
  });
}
