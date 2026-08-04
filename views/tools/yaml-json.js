import { renderToolPage } from "./page-shell.js";

export function renderYamlJson(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsYamlJson",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M8 9h8M8 13h8M8 17h5"/></svg>`,
    heading: "YAML ⇄ JSON Converter",
    subtitle: "Convert YAML to JSON, or JSON back to YAML.",
    bodyHtml: `
      <div class="field">
        <label for="directionSelect">Direction</label>
        <select id="directionSelect">
          <option value="yamlToJson">YAML → JSON</option>
          <option value="jsonToYaml">JSON → YAML</option>
        </select>
      </div>
      <div class="field">
        <label for="inputText">Input</label>
        <textarea id="inputText" rows="10" placeholder="Paste YAML or JSON here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var directionSelect = document.getElementById('directionSelect');
      var inputText = document.getElementById('inputText');
      setExtraValid(false);
      inputText.addEventListener('input', function(){ setExtraValid(inputText.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/yaml-json', { input: inputText.value, direction: directionSelect.value });
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
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
