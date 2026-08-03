import { renderToolPage } from "./page-shell.js";

export function renderWordCounter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsWordCounter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h10M4 18h16"/></svg>`,
    heading: "Word & Character Counter",
    subtitle: "Count words, characters, sentences and paragraphs instantly.",
    bodyHtml: `
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="9" placeholder="Paste or type text here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Counting…';
        try {
          var data = await postTool('/api/tools/word-count', { text: textInput.value });
          var rows = [['Words', data.words], ['Characters', data.characters], ['Characters (no spaces)', data.charactersNoSpaces], ['Lines', data.lines], ['Sentences', data.sentences], ['Paragraphs', data.paragraphs]];
          resultEl.innerHTML = '<div class="result-head"><span>Results</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Count';
        resetAltcha();
      });`,
  });
}
