import { renderToolPage } from "./page-shell.js";

export function renderJsonDiff(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsJsonDiff",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/></svg>`,
    heading: "JSON Diff",
    subtitle: "Compare two JSON structures and see exactly which keys changed, were added, or removed.",
    bodyHtml: `
      <div class="field">
        <label for="jsonA">JSON A</label>
        <textarea id="jsonA" rows="6" placeholder='{"name": "A"}' spellcheck="false"></textarea>
      </div>
      <div class="field">
        <label for="jsonB">JSON B</label>
        <textarea id="jsonB" rows="6" placeholder='{"name": "B"}' spellcheck="false"></textarea>
      </div>`,
    extraStyle: `
      .jd-added{color:var(--green)}
      .jd-removed{color:var(--red)}
      .jd-changed{color:var(--accent)}`,
    script: `
      var jsonA = document.getElementById('jsonA');
      var jsonB = document.getElementById('jsonB');
      setExtraValid(false);
      function checkValid(){ setExtraValid(jsonA.value.trim().length > 0 && jsonB.value.trim().length > 0); }
      jsonA.addEventListener('input', checkValid);
      jsonB.addEventListener('input', checkValid);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Comparing…';
        try {
          var data = await postTool('/api/tools/json-diff', { jsonA: jsonA.value, jsonB: jsonB.value });
          if (data.identical) {
            resultEl.innerHTML = '<div class="result-head"><span>Result</span></div><p style="color:var(--green);font-size:.86rem">These are identical.</p>';
          } else {
            var rows = data.diffs.map(function(d){
              var cls = 'jd-' + d.type;
              var label = d.type === 'added' ? 'added' : d.type === 'removed' ? 'removed' : 'changed';
              var detail = d.type === 'added' ? JSON.stringify(d.to)
                : d.type === 'removed' ? JSON.stringify(d.from)
                : JSON.stringify(d.from) + ' → ' + JSON.stringify(d.to);
              return '<div class="' + cls + '" style="font-family:var(--font-mono);font-size:.78rem;padding:4px 0;border-bottom:1px solid var(--border)"><b>' + esc(d.path) + '</b> (' + label + '): ' + esc(detail) + '</div>';
            }).join('');
            resultEl.innerHTML = '<div class="result-head"><span>' + data.diffs.length + ' difference' + (data.diffs.length === 1 ? '' : 's') + '</span></div>' + rows;
          }
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
