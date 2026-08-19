import { renderToolPage } from "./page-shell.js";

export function renderCssGradient(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsCssGradient",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 3l18 18" stroke-linecap="round"/></svg>`,
    heading: "CSS Gradient Generator",
    subtitle: "Pick colors and get ready-to-use CSS gradient code, with a live preview.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="typeSelect">Type</label>
          <select id="typeSelect"><option value="linear">Linear</option><option value="radial">Radial</option></select>
        </div>
        <div class="field" style="flex:1" id="angleField">
          <label for="angleInput">Angle (°)</label>
          <input type="text" id="angleInput" value="90" inputmode="numeric">
        </div>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="color1">Color 1</label>
          <input type="color" id="color1" value="#00e0ff" style="width:100%;height:42px;padding:2px;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px">
        </div>
        <div class="field" style="flex:1">
          <label for="color2">Color 2</label>
          <input type="color" id="color2" value="#7c5cff" style="width:100%;height:42px;padding:2px;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px">
        </div>
      </div>
      <div id="gradientPreview" style="height:100px;border-radius:12px;margin-bottom:14px;border:1px solid var(--border-strong)"></div>`,
    script: `
      var typeSelect = document.getElementById('typeSelect');
      var angleInput = document.getElementById('angleInput');
      var angleField = document.getElementById('angleField');
      var color1 = document.getElementById('color1');
      var color2 = document.getElementById('color2');
      var preview = document.getElementById('gradientPreview');
      setExtraValid(true);

      function livePreview(){
        var css = typeSelect.value === 'linear'
          ? 'linear-gradient(' + (angleInput.value || 0) + 'deg, ' + color1.value + ', ' + color2.value + ')'
          : 'radial-gradient(circle, ' + color1.value + ', ' + color2.value + ')';
        preview.style.background = css;
        angleField.style.display = typeSelect.value === 'linear' ? 'block' : 'none';
      }
      typeSelect.addEventListener('change', livePreview);
      angleInput.addEventListener('input', livePreview);
      color1.addEventListener('input', livePreview);
      color2.addEventListener('input', livePreview);
      livePreview();

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/css-gradient', {
            type: typeSelect.value, angle: angleInput.value, colors: [color1.value, color2.value],
          });
          resultEl.innerHTML = '<div class="result-head"><span>CSS</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.css) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.css).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get CSS';
        resetAltcha();
      });`,
  });
}
