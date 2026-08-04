import { renderToolPage } from "./page-shell.js";

export function renderOcrTool(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsOcrTool",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h7M7 17h4"/></svg>`,
    heading: "Image Text Extractor (OCR)",
    subtitle: "Upload an image containing text and extract it as editable text. Runs a full OCR engine right in your browser.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput" accept="image/*">
        <div class="file-drop-label"><b>Click to upload</b> or drag an image with text here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>
      <div id="previewWrap" style="display:none;text-align:center;margin-bottom:6px">
        <img id="ocrPreview" class="result-img" alt="Image preview">
      </div>
      <div id="ocrProgress" style="display:none;font-size:.76rem;color:var(--muted);text-align:center;margin-bottom:8px"></div>`,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var previewWrap = document.getElementById('previewWrap');
      var ocrPreview = document.getElementById('ocrPreview');
      var ocrProgress = document.getElementById('ocrProgress');
      var pendingFile = null;
      var tesseractPromise = null;
      setExtraValid(false);

      function loadTesseract(){
        if (window.Tesseract) return Promise.resolve();
        if (tesseractPromise) return tesseractPromise;
        tesseractPromise = new Promise(function(resolve, reject){
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = resolve;
          s.onerror = function(){ reject(new Error('Could not load the OCR engine.')); };
          document.head.appendChild(s);
        });
        return tesseractPromise;
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
        pendingFile = file;
        var reader = new FileReader();
        reader.onload = function(){
          ocrPreview.src = reader.result;
          previewWrap.style.display = 'block';
          setExtraValid(true);
        };
        reader.readAsDataURL(file);
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!pendingFile) { showMsg('Upload an image first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Loading OCR engine…';
        ocrProgress.style.display = 'block';
        ocrProgress.textContent = 'Loading OCR engine (first run downloads ~2MB)…';
        try {
          await postTool('/api/tools/ocr-gate', {});
          await loadTesseract();
          submitBtn.innerHTML = '<span class="btn-spinner"></span>Reading text…';
          var result = await window.Tesseract.recognize(pendingFile, 'eng', {
            logger: function(m){
              if (m.status && typeof m.progress === 'number') {
                ocrProgress.textContent = m.status + ': ' + Math.round(m.progress * 100) + '%';
              }
            },
          });
          ocrProgress.style.display = 'none';
          var text = (result && result.data && result.data.text || '').trim();
          if (!text) {
            showMsg('No text could be detected in that image.', false);
          } else {
            resultEl.innerHTML = '<div class="result-head"><span>Extracted Text</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
              '<pre class="result-pre">' + esc(text) + '</pre>';
            showResult();
            document.getElementById('copyResultBtn').addEventListener('click', function(){
              navigator.clipboard.writeText(text).catch(function(){});
            });
          }
        } catch (err) {
          ocrProgress.style.display = 'none';
          showMsg(err.message || 'Could not extract text from that image.', false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Extract Text';
        resetAltcha();
      });`,
  });
}
