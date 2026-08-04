import { renderToolPage } from "./page-shell.js";

export function renderContrastChecker(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsContrastChecker",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/></svg>`,
    heading: "Contrast Checker",
    subtitle: "Check whether two colors meet WCAG accessibility contrast guidelines.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="fgInput">Text Color</label>
          <div style="display:flex;gap:8px">
            <input type="color" id="fgPicker" value="#f3f3fa" style="width:44px;height:42px;padding:2px;flex-shrink:0;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px">
            <input type="text" id="fgInput" value="#F3F3FA" style="flex:1">
          </div>
        </div>
        <div class="field" style="flex:1">
          <label for="bgInput">Background Color</label>
          <div style="display:flex;gap:8px">
            <input type="color" id="bgPicker" value="#0a0a0f" style="width:44px;height:42px;padding:2px;flex-shrink:0;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px">
            <input type="text" id="bgInput" value="#0A0A0F" style="flex:1">
          </div>
        </div>
      </div>
      <div id="contrastPreview" style="border-radius:10px;padding:20px;text-align:center;font-weight:700;margin-bottom:14px;border:1px solid var(--border-strong)">Preview Text</div>`,
    script: `
      var fgInput = document.getElementById('fgInput');
      var bgInput = document.getElementById('bgInput');
      var fgPicker = document.getElementById('fgPicker');
      var bgPicker = document.getElementById('bgPicker');
      var preview = document.getElementById('contrastPreview');
      setExtraValid(true);
      function syncPreview(){
        preview.style.color = fgInput.value;
        preview.style.background = bgInput.value;
      }
      fgPicker.addEventListener('input', function(){ fgInput.value = fgPicker.value; syncPreview(); });
      bgPicker.addEventListener('input', function(){ bgInput.value = bgPicker.value; syncPreview(); });
      fgInput.addEventListener('input', function(){ if (/^#?[0-9a-f]{6}$/i.test(fgInput.value.trim())) fgPicker.value = fgInput.value.trim().replace(/^(?!#)/, '#'); syncPreview(); });
      bgInput.addEventListener('input', function(){ if (/^#?[0-9a-f]{6}$/i.test(bgInput.value.trim())) bgPicker.value = bgInput.value.trim().replace(/^(?!#)/, '#'); syncPreview(); });
      syncPreview();

      function pass(ok){ return ok ? '<span style="color:var(--green)">Pass</span>' : '<span style="color:var(--red)">Fail</span>'; }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Checking…';
        try {
          var data = await postTool('/api/tools/contrast-check', { foreground: fgInput.value, background: bgInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Contrast Ratio: ' + esc(data.ratio) + ':1</span></div>' +
            '<table class="result-table">' +
            '<tr><td>AA — Normal text</td><td>' + pass(data.aaNormal) + '</td></tr>' +
            '<tr><td>AA — Large text</td><td>' + pass(data.aaLarge) + '</td></tr>' +
            '<tr><td>AAA — Normal text</td><td>' + pass(data.aaaNormal) + '</td></tr>' +
            '<tr><td>AAA — Large text</td><td>' + pass(data.aaaLarge) + '</td></tr>' +
            '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Check Contrast';
        resetAltcha();
      });`,
  });
}
