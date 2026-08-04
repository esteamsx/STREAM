import { renderToolPage } from "./page-shell.js";

export function renderJsonSchemaValidate(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsJsonSchemaValidate",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>`,
    heading: "JSON Schema Validator",
    subtitle: "Check whether a JSON document matches a JSON Schema. Reports every mismatch, not just the first one.",
    bodyHtml: `
      <div class="field">
        <label for="jsonInput">JSON Data</label>
        <textarea id="jsonInput" rows="7" placeholder='{"name":"Ada","age":30}' spellcheck="false"></textarea>
      </div>
      <div class="field">
        <label for="schemaInput">JSON Schema</label>
        <textarea id="schemaInput" rows="7" placeholder='{"type":"object","required":["name"],"properties":{"name":{"type":"string"},"age":{"type":"number","minimum":0}}}' spellcheck="false"></textarea>
      </div>`,
    script: `
      var jsonInput = document.getElementById('jsonInput');
      var schemaInput = document.getElementById('schemaInput');
      setExtraValid(false);
      function checkValid(){ setExtraValid(jsonInput.value.trim().length > 0 && schemaInput.value.trim().length > 0); }
      jsonInput.addEventListener('input', checkValid);
      schemaInput.addEventListener('input', checkValid);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Validating…';
        try {
          var data = await postTool('/api/tools/json-schema-validate', { json: jsonInput.value, schema: schemaInput.value });
          if (data.valid) {
            resultEl.innerHTML = '<div class="result-head"><span>Result</span></div><p style="font-size:.95rem;font-weight:700;color:var(--green)">Valid. The JSON matches the schema.</p>';
          } else {
            resultEl.innerHTML = '<div class="result-head"><span>' + data.errors.length + ' Issue' + (data.errors.length === 1 ? '' : 's') + '</span></div>' +
              '<ul style="padding-left:18px;font-size:.82rem;color:var(--red);line-height:1.8">' + data.errors.map(function(e){ return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
          }
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Validate';
        resetAltcha();
      });`,
  });
}
