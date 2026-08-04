import { renderToolPage } from "./page-shell.js";

export function renderRegexTester(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsRegexTester",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9h16M4 15h16"/></svg>`,
    heading: "Regex Tester",
    subtitle: "Test a regular expression against some text and see every match.",
    bodyHtml: `
      <div class="field">
        <label for="patternInput">Pattern</label>
        <input type="text" id="patternInput" placeholder="\\w+@\\w+\\.\\w+" autocomplete="off" spellcheck="false">
      </div>
      <div class="field" style="display:flex;flex-wrap:wrap;gap:14px">
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="flagG" checked> Global (g)</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="flagI"> Ignore case (i)</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="flagM"> Multiline (m)</label>
        <label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:.82rem;color:var(--text)"><input type="checkbox" id="flagS"> Dotall (s)</label>
      </div>
      <div class="field">
        <label for="testInput">Test String</label>
        <textarea id="testInput" rows="8" placeholder="Paste text to test against…" spellcheck="false"></textarea>
      </div>`,
    extraStyle: `
      .rx-match{padding:8px 10px;border-bottom:1px solid var(--border);font-size:.82rem}
      .rx-match:last-child{border-bottom:none}
      .rx-match-text{font-family:var(--font-mono);color:var(--accent);word-break:break-all}
      .rx-match-idx{color:var(--muted);font-size:.72rem;margin-left:6px}
      .rx-match-groups{color:var(--muted);font-size:.74rem;margin-top:2px;font-family:var(--font-mono)}
      .rx-list{background:var(--dark3);border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:340px;overflow-y:auto}
    `,
    script: `
      var patternInput = document.getElementById('patternInput');
      var testInput = document.getElementById('testInput');
      setExtraValid(false);
      function checkValid(){ setExtraValid(patternInput.value.trim().length > 0 && testInput.value.length > 0); }
      patternInput.addEventListener('input', checkValid);
      testInput.addEventListener('input', checkValid);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Testing…';
        try {
          var flags = (document.getElementById('flagG').checked ? 'g' : '') +
            (document.getElementById('flagI').checked ? 'i' : '') +
            (document.getElementById('flagM').checked ? 'm' : '') +
            (document.getElementById('flagS').checked ? 's' : '');
          var data = await postTool('/api/tools/regex-test', { pattern: patternInput.value, flags: flags, testString: testInput.value });
          if (!data.matches.length) {
            resultEl.innerHTML = '<div class="result-head"><span>Results</span></div><div style="font-size:.85rem;color:var(--muted)">No matches found.</div>';
          } else {
            resultEl.innerHTML = '<div class="result-head"><span>' + data.matches.length + ' Match' + (data.matches.length === 1 ? '' : 'es') + (data.truncated ? ' (showing first 500)' : '') + '</span></div>' +
              '<div class="rx-list">' + data.matches.map(function(m){
                var groups = m.groups.filter(function(g){ return g != null; });
                return '<div class="rx-match"><span class="rx-match-text">' + esc(m.match || '(empty match)') + '</span>' +
                  '<span class="rx-match-idx">at index ' + m.index + '</span>' +
                  (groups.length ? '<div class="rx-match-groups">groups: ' + groups.map(esc).join(', ') + '</div>' : '') +
                  '</div>';
              }).join('') + '</div>';
          }
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Test';
        resetAltcha();
      });`,
  });
}
