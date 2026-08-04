import { renderToolPage } from "./page-shell.js";

export function renderSortLines(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSortLines",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M7 6h13M7 12h9M7 18h5"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 16l1.5 2L6 16"/><path d="M4.5 6v12"/></svg>`,
    heading: "Text Sorter",
    subtitle: "Sort lines alphabetically or numerically, ascending or descending.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="orderSelect">Order</label>
          <select id="orderSelect"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
        </div>
        <div class="field" style="flex:1">
          <label for="modeSelect">Sort By</label>
          <select id="modeSelect"><option value="alpha">Alphabetical</option><option value="numeric">Numeric</option></select>
        </div>
      </div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="9" placeholder="One line per entry…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var orderSelect = document.getElementById('orderSelect');
      var modeSelect = document.getElementById('modeSelect');
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Sorting…';
        try {
          var data = await postTool('/api/tools/sort-lines', { text: textInput.value, order: orderSelect.value, numeric: modeSelect.value === 'numeric' });
          resultEl.innerHTML = '<div class="result-head"><span>Sorted</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sort';
        resetAltcha();
      });`,
  });
}
