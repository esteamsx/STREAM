import { renderToolPage } from "./page-shell.js";

export function renderColorblindSimulator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsColorblindSimulator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.4" fill="currentColor" stroke="none"/><path stroke-linecap="round" d="M8 15.5c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5"/></svg>`,
    heading: "Color Blindness Simulator",
    subtitle: "Upload an image and preview how it looks to people with different types of color vision deficiency.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput" accept="image/*">
        <div class="file-drop-label"><b>Click to upload</b> or drag an image here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>
      <div class="field">
        <label for="typeSelect">Simulate</label>
        <select id="typeSelect">
          <option value="protanopia">Protanopia (red-blind)</option>
          <option value="deuteranopia">Deuteranopia (green-blind)</option>
          <option value="tritanopia">Tritanopia (blue-blind)</option>
          <option value="achromatopsia">Achromatopsia (full color blindness)</option>
        </select>
      </div>`,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var typeSelect = document.getElementById('typeSelect');
      var loadedImg = null;
      setExtraValid(false);

      var MATRICES = {
        protanopia:   [0.567,0.433,0, 0.558,0.442,0, 0,0.242,0.758],
        deuteranopia: [0.625,0.375,0, 0.7,0.3,0, 0,0.3,0.7],
        tritanopia:   [0.95,0.05,0, 0,0.433,0.567, 0,0.475,0.525],
        achromatopsia:[0.299,0.587,0.114, 0.299,0.587,0.114, 0.299,0.587,0.114],
      };

      fileDrop.addEventListener('click', function(){ fileInput.click(); });
      fileDrop.addEventListener('dragover', function(e){ e.preventDefault(); fileDrop.classList.add('drag'); });
      fileDrop.addEventListener('dragleave', function(){ fileDrop.classList.remove('drag'); });
      fileDrop.addEventListener('drop', function(e){
        e.preventDefault(); fileDrop.classList.remove('drag');
        if (e.dataTransfer.files[0]) { fileInput.files = e.dataTransfer.files; handleFile(e.dataTransfer.files[0]); }
      });
      fileInput.addEventListener('change', function(){ if (fileInput.files[0]) handleFile(fileInput.files[0]); });

      function handleFile(file){
        hideMsg(); hideResult();
        if (!file.type.startsWith('image/')) { showMsg('Please choose an image file.', false); return; }
        fileName.textContent = file.name;
        var reader = new FileReader();
        reader.onload = function(){
          var img = new Image();
          img.onload = function(){ loadedImg = img; setExtraValid(true); };
          img.onerror = function(){ showMsg('Could not read that image.', false); };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!loadedImg) { showMsg('Upload an image first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Simulating…';
        try {
          await postTool('/api/tools/colorblind-gate', {});
          var maxDim = 900;
          var scale = Math.min(1, maxDim / Math.max(loadedImg.naturalWidth, loadedImg.naturalHeight));
          var w = Math.round(loadedImg.naturalWidth * scale);
          var h = Math.round(loadedImg.naturalHeight * scale);
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImg, 0, 0, w, h);
          var imgData = ctx.getImageData(0, 0, w, h);
          var d = imgData.data;
          var m = MATRICES[typeSelect.value];
          for (var i = 0; i < d.length; i += 4) {
            var r = d[i], g = d[i+1], b = d[i+2];
            d[i]   = Math.min(255, Math.max(0, r*m[0] + g*m[1] + b*m[2]));
            d[i+1] = Math.min(255, Math.max(0, r*m[3] + g*m[4] + b*m[5]));
            d[i+2] = Math.min(255, Math.max(0, r*m[6] + g*m[7] + b*m[8]));
          }
          ctx.putImageData(imgData, 0, 0);
          resultEl.innerHTML = '<div class="result-head"><span>Simulated Result</span><button class="copy-btn" id="dlResultBtn" type="button">Download</button></div>';
          var img2 = document.createElement('img');
          img2.className = 'result-img'; img2.style.maxWidth = '100%'; img2.src = canvas.toDataURL('image/png');
          resultEl.appendChild(img2);
          showResult();
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerDataUrlDownload(canvas.toDataURL('image/png'), 'colorblind-' + typeSelect.value + '.png');
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Simulate';
        resetAltcha();
      });`,
  });
}
