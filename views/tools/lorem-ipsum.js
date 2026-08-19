import { renderToolPage } from "./page-shell.js";

export function renderLoremIpsum(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsLoremIpsum",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
    heading: "Lorem Ipsum Generator",
    subtitle: "Generate placeholder paragraphs for mockups and layouts.",
    bodyHtml: `
      <div class="field">
        <label for="paraInput">Paragraphs: <span id="paraValue">3</span></label>
        <input type="range" id="paraInput" min="1" max="20" value="3" style="width:100%">
      </div>`,
    script: `
      var paraInput = document.getElementById('paraInput');
      var paraValue = document.getElementById('paraValue');
      setExtraValid(true);
      paraInput.addEventListener('input', function(){ paraValue.textContent = paraInput.value; });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/lorem-ipsum', { paragraphs: Number(paraInput.value) });
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
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
