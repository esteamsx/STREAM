import { renderToolPage } from "./page-shell.js";

export function renderFaviconGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsFaviconGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 13l2.5 2.5L16 10"/></svg>`,
    heading: "Favicon Generator",
    subtitle: "Upload an image and get every favicon size you need (16×16 up to 512×512), generated entirely in your browser.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput" accept="image/*">
        <div class="file-drop-label"><b>Click to upload</b> or drag an image here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>
      <div id="previewWrap" style="display:none;text-align:center;margin-bottom:6px">
        <img id="sourcePreview" class="result-img" alt="Source image preview">
      </div>`,
    extraStyle: `
      .fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-top:6px}
      .fav-item{background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center}
      .fav-item canvas{background:repeating-conic-gradient(#0000 0 25%,rgba(255,255,255,.06) 0 50%) 0 0/12px 12px;border-radius:6px;margin-bottom:6px}
      .fav-item .copy-btn{width:100%;justify-content:center}
    `,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var previewWrap = document.getElementById('previewWrap');
      var sourcePreview = document.getElementById('sourcePreview');
      var SIZES = [16, 32, 48, 64, 180, 192, 512];
      var loadedImg = null;
      setExtraValid(false);

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
          img.onload = function(){
            loadedImg = img;
            sourcePreview.src = reader.result;
            previewWrap.style.display = 'block';
            setExtraValid(true);
          };
          img.onerror = function(){ showMsg('Could not read that image.', false); };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!loadedImg) { showMsg('Upload an image first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          await postTool('/api/tools/favicon-gate', {});
          var grid = document.createElement('div');
          grid.className = 'fav-grid';
          SIZES.forEach(function(size){
            var canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(loadedImg, 0, 0, size, size);
            var displaySize = Math.min(size, 72);
            var item = document.createElement('div');
            item.className = 'fav-item';
            var dispCanvas = document.createElement('canvas');
            dispCanvas.width = displaySize; dispCanvas.height = displaySize;
            dispCanvas.getContext('2d').drawImage(canvas, 0, 0, displaySize, displaySize);
            var btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = size + '×' + size;
            bindAnimatedDownload(btn, function(c, s){
              return function(){ triggerDataUrlDownload(c.toDataURL('image/png'), 'favicon-' + s + 'x' + s + '.png'); };
            }(canvas, size));
            item.appendChild(dispCanvas);
            item.appendChild(btn);
            grid.appendChild(item);
          });
          resultEl.innerHTML = '<div class="result-head"><span>Generated Sizes</span></div>';
          resultEl.appendChild(grid);
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Favicons';
        resetAltcha();
      });`,
  });
}
