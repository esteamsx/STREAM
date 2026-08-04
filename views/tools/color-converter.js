import { renderToolPage } from "./page-shell.js";

export function renderColorConverter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsColorConverter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18 4.5 4.5 0 000-9h1a3 3 0 000-6"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10" cy="7" r="1"/></svg>`,
    heading: "Color Converter",
    subtitle: "Convert between Hex, RGB and HSL color formats.",
    bodyHtml: `
      <div class="field">
        <label for="colorInput">Color (hex, rgb(), or hsl())</label>
        <input type="text" id="colorInput" placeholder="#00e0ff" autocomplete="off" spellcheck="false">
      </div>`,
    extraStyle: `.color-swatch{width:100%;height:60px;border-radius:10px;border:1px solid var(--border-strong);margin-bottom:10px}`,
    script: `
      var colorInput = document.getElementById('colorInput');
      setExtraValid(false);
      colorInput.addEventListener('input', function(){ setExtraValid(colorInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/color-convert', { input: colorInput.value.trim() });
          var rows = [['Hex', data.hex], ['RGB', data.rgb], ['HSL', data.hsl]];
          resultEl.innerHTML = '<div class="color-swatch" style="background:' + esc(data.hex) + '"></div>' +
            '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
