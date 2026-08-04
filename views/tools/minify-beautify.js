import { renderToolPage } from "./page-shell.js";

export function renderMinifyBeautify(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsMinifyBeautify",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 4l-6 8 6 8M16 4l6 8-6 8"/></svg>`,
    heading: "Code Minifier / Beautifier",
    subtitle: "Minify JS, CSS or HTML for production, or beautify compressed code back into a readable format.",
    bodyHtml: `
      <div class="field-row">
        <div class="field">
          <label for="langSelect">Language</label>
          <select id="langSelect">
            <option value="js">JavaScript</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
          </select>
        </div>
        <div class="field">
          <label for="modeSelect">Mode</label>
          <select id="modeSelect">
            <option value="minify">Minify</option>
            <option value="beautify">Beautify</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="codeInput">Code</label>
        <textarea id="codeInput" rows="10" placeholder="Paste your code here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var langSelect = document.getElementById('langSelect');
      var modeSelect = document.getElementById('modeSelect');
      var codeInput = document.getElementById('codeInput');
      setExtraValid(false);
      codeInput.addEventListener('input', function(){ setExtraValid(codeInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        var mode = modeSelect.value;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>' + (mode === 'minify' ? 'Minifying…' : 'Beautifying…');
        try {
          var data = await postTool('/api/tools/minify', { lang: langSelect.value, mode: mode, code: codeInput.value });
          var ext = langSelect.value === 'js' ? 'js' : langSelect.value === 'css' ? 'css' : 'html';
          resultEl.innerHTML = '<div class="result-head"><span>Output</span><span style="display:flex;gap:6px"><button class="copy-btn" id="copyResultBtn" type="button">Copy</button><button class="copy-btn" id="dlResultBtn" type="button">Download</button></span></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerBlobDownload(data.output, 'output.' + ext, 'text/plain');
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'minify' ? 'Minify' : 'Beautify';
        resetAltcha();
      });`,
  });
}
