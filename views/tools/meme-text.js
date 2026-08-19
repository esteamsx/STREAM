import { renderToolPage } from "./page-shell.js";

export function renderMemeText(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsMemeText",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 15l5-5 4 4 5-6 4 5"/></svg>`,
    heading: "Meme Text Generator",
    subtitle: "Upload an image, add top and bottom captions in classic meme style, and download the result.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput" accept="image/*">
        <div class="file-drop-label"><b>Click to upload</b> or drag an image here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>
      <div class="field">
        <label for="topText">Top Text</label>
        <input type="text" id="topText" placeholder="TOP TEXT">
      </div>
      <div class="field">
        <label for="bottomText">Bottom Text</label>
        <input type="text" id="bottomText" placeholder="BOTTOM TEXT">
      </div>
      <canvas id="memeCanvas" style="display:none;width:100%;border-radius:10px;margin-bottom:10px"></canvas>`,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var topText = document.getElementById('topText');
      var bottomText = document.getElementById('bottomText');
      var canvas = document.getElementById('memeCanvas');
      var ctx = canvas.getContext('2d');
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
          img.onload = function(){ loadedImg = img; setExtraValid(true); drawMeme(); };
          img.onerror = function(){ showMsg('Could not read that image.', false); };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      }

      function wrapAndDraw(text, y, maxWidth, fontSize, alignTop){
        if (!text) return;
        ctx.font = 'bold ' + fontSize + 'px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = fontSize / 12;
        ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
        var words = text.toUpperCase().split(' ');
        var lines = []; var line = '';
        words.forEach(function(w){
          var test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
          else line = test;
        });
        if (line) lines.push(line);
        lines.forEach(function(l, i){
          var ly = alignTop ? y + i * (fontSize * 1.1) : y - (lines.length - 1 - i) * (fontSize * 1.1);
          ctx.strokeText(l, canvas.width / 2, ly);
          ctx.fillText(l, canvas.width / 2, ly);
        });
      }

      function drawMeme(){
        if (!loadedImg) return;
        canvas.width = loadedImg.naturalWidth;
        canvas.height = loadedImg.naturalHeight;
        canvas.style.display = 'block';
        ctx.drawImage(loadedImg, 0, 0);
        var fontSize = Math.max(24, Math.round(canvas.width / 12));
        wrapAndDraw(topText.value, fontSize + 6, canvas.width * 0.92, fontSize, true);
        wrapAndDraw(bottomText.value, canvas.height - 14, canvas.width * 0.92, fontSize, false);
      }
      topText.addEventListener('input', drawMeme);
      bottomText.addEventListener('input', drawMeme);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!loadedImg) { showMsg('Upload an image first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Rendering…';
        try {
          await postTool('/api/tools/meme-text-gate', {});
          drawMeme();
          resultEl.innerHTML = '<div class="result-head"><span>Meme Ready</span><button class="copy-btn" id="dlResultBtn" type="button">Download</button></div>';
          showResult();
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerDataUrlDownload(canvas.toDataURL('image/png'), 'meme.png');
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Meme';
        resetAltcha();
      });`,
  });
}
