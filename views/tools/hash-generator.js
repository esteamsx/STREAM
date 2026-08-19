import { renderToolPage } from "./page-shell.js";

export function renderHashGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsHashGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18"/></svg>`,
    heading: "Hash Generator",
    subtitle: "MD5, SHA-1, SHA-256 or SHA-512. Hash text or a file (max 20MB).",
    bodyHtml: `
      <div class="field">
        <label for="algoSelect">Algorithm</label>
        <select id="algoSelect">
          <option value="sha256">SHA-256</option>
          <option value="sha1">SHA-1</option>
          <option value="md5">MD5</option>
          <option value="sha512">SHA-512</option>
        </select>
      </div>
      <div class="field">
        <label>Upload a file (optional)</label>
        <div class="file-drop" id="fileDrop">
          <input type="file" id="fileInput">
          <div class="file-drop-label"><b>Click to choose</b> a file (max 20MB)</div>
          <div class="file-drop-name" id="fileDropName"></div>
        </div>
      </div>
      <div class="or-divider">or type text below</div>
      <div class="field">
        <label for="textInput">Text</label>
        <textarea id="textInput" rows="6" placeholder="Type or paste text to hash…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var algoSelect = document.getElementById('algoSelect');
      var textInput = document.getElementById('textInput');
      var fileInput = document.getElementById('fileInput');
      var fileDrop = document.getElementById('fileDrop');
      var fileDropName = document.getElementById('fileDropName');
      var MAX_FILE_BYTES = 20 * 1024 * 1024;
      var fileBase64 = '';

      setExtraValid(false);
      textInput.addEventListener('input', function(){
        fileBase64 = '';
        fileDropName.textContent = '';
        setExtraValid(textInput.value.length > 0);
      });

      fileDrop.addEventListener('click', function(){ fileInput.click(); });
      fileInput.addEventListener('change', function(){
        var file = fileInput.files[0];
        if (!file) return;
        hideMsg();
        if (file.size > MAX_FILE_BYTES) {
          showMsg('That file is over 20MB. Pick a smaller one.', false);
          fileInput.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function(){
          var result = String(reader.result || '');
          fileBase64 = result.slice(result.indexOf(',') + 1);
          fileDropName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB) loaded';
          textInput.value = '';
          setExtraValid(true);
        };
        reader.onerror = function(){ showMsg('Could not read that file.', false); };
        reader.readAsDataURL(file);
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Hashing…';
        try {
          var payload = { algorithm: algoSelect.value };
          if (fileBase64) payload.fileBase64 = fileBase64;
          else payload.text = textInput.value;
          var data = await postTool('/api/tools/hash', payload);
          resultEl.innerHTML = '<div class="result-head"><span>' + esc(data.algorithm.toUpperCase()) + ' Hash</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.hash) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.hash).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Hash';
        resetAltcha();
      });`,
  });
}
