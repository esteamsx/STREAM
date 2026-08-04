import { renderToolPage } from "./page-shell.js";

export function renderQrScanner(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsQrScanner",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path stroke-linecap="round" d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/></svg>`,
    heading: "QR Code Scanner",
    subtitle: "Upload an image of a QR code and decode its contents — all in your browser, nothing is uploaded.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput" accept="image/*">
        <div class="file-drop-label"><b>Click to upload</b> or drag a QR code image here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>
      <div id="previewWrap" style="display:none;text-align:center;margin-bottom:6px">
        <img id="qrPreview" class="result-img" alt="QR code preview">
      </div>`,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var previewWrap = document.getElementById('previewWrap');
      var qrPreview = document.getElementById('qrPreview');
      var loadedImg = null;
      var jsQRPromise = null;
      setExtraValid(false);

      function loadJsQR(){
        if (window.jsQR) return Promise.resolve();
        if (jsQRPromise) return jsQRPromise;
        jsQRPromise = new Promise(function(resolve, reject){
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
          s.onload = resolve;
          s.onerror = function(){ reject(new Error('Could not load the QR decoding library.')); };
          document.head.appendChild(s);
        });
        return jsQRPromise;
      }

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
            qrPreview.src = reader.result;
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
        if (!loadedImg) { showMsg('Upload a QR code image first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Scanning…';
        try {
          await postTool('/api/tools/qr-scan-gate', {});
          await loadJsQR();
          var canvas = document.createElement('canvas');
          canvas.width = loadedImg.naturalWidth;
          canvas.height = loadedImg.naturalHeight;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImg, 0, 0);
          var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var code = window.jsQR(imgData.data, imgData.width, imgData.height);
          if (!code || !code.data) {
            showMsg('No QR code found in that image.', false);
          } else {
            var isUrl = /^https?:\\/\\//i.test(code.data);
            resultEl.innerHTML = '<div class="result-head"><span>Decoded Content</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
              '<pre class="result-pre">' + esc(code.data) + '</pre>' +
              (isUrl ? '<p style="margin-top:10px"><a href="' + esc(code.data) + '" target="_blank" rel="noopener noreferrer">Open link →</a></p>' : '');
            showResult();
            document.getElementById('copyResultBtn').addEventListener('click', function(){
              navigator.clipboard.writeText(code.data).catch(function(){});
            });
          }
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Scan QR Code';
        resetAltcha();
      });`,
  });
}
