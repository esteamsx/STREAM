import { renderToolPage } from "./page-shell.js";

export function renderObfuscate(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsObfuscate",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-12M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>`,
    heading: "JavaScript Obfuscator",
    subtitle: "Paste JavaScript code, or upload a .js file (max 20MB). Control-flow flattening, string encoding, self-defending code.",
    bodyHtml: `
      <div class="field">
        <label>Upload a .js file</label>
        <div class="file-drop" id="fileDrop">
          <input type="file" id="fileInput" accept=".js,text/javascript,application/javascript">
          <div class="file-drop-label"><b>Click to choose</b> a .js file (max 20MB)</div>
          <div class="file-drop-name" id="fileDropName"></div>
        </div>
      </div>
      <div class="or-divider">or paste code below</div>
      <div class="field">
        <label for="codeInput">JavaScript Code</label>
        <textarea id="codeInput" rows="9" placeholder="function greet(name) { return 'Hello, ' + name; }" spellcheck="false"></textarea>
      </div>`,
    script: `
      var codeInput = document.getElementById('codeInput');
      var fileInput = document.getElementById('fileInput');
      var fileDrop = document.getElementById('fileDrop');
      var fileDropName = document.getElementById('fileDropName');
      var MAX_FILE_BYTES = 20 * 1024 * 1024;
      var uploadedFileName = '';

      setExtraValid(false);
      codeInput.addEventListener('input', function(){
        uploadedFileName = '';
        fileDropName.textContent = '';
        setExtraValid(codeInput.value.trim().length > 0);
      });

      fileDrop.addEventListener('click', function(){ fileInput.click(); });
      fileInput.addEventListener('change', function(){
        var file = fileInput.files[0];
        if (!file) return;
        hideMsg();
        if (!/\\.js$/i.test(file.name)) {
          showMsg('Please choose a .js file.', false);
          fileInput.value = '';
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          showMsg('That file is over 20MB. Pick a smaller one.', false);
          fileInput.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function(){
          codeInput.value = String(reader.result || '');
          uploadedFileName = file.name;
          fileDropName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB) loaded';
          setExtraValid(codeInput.value.trim().length > 0);
        };
        reader.onerror = function(){ showMsg('Could not read that file.', false); };
        reader.readAsText(file);
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        var isLarge = codeInput.value.length > 200000;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>' + (isLarge ? 'Obfuscating… large files can take a minute or two' : 'Obfuscating…');
        try {
          var data = await postTool('/api/tools/obfuscate', { code: codeInput.value });
          var downloadName = (uploadedFileName ? uploadedFileName.replace(/\\.js$/i, '') : 'obfuscated') + '.obfuscated.js';
          resultEl.innerHTML = '<div class="result-head"><span>Obfuscated Code Preview</span>' +
            '<span style="display:flex;gap:6px">' +
            '<button class="copy-btn" id="copyResultBtn" type="button">Copy</button>' +
            '<button class="copy-btn" id="downloadResultBtn" type="button">Download</button>' +
            '</span></div>' +
            '<pre class="result-pre">' + esc(data.code) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.code).catch(function(){});
          });
          bindAnimatedDownload(document.getElementById('downloadResultBtn'), function(){
            triggerBlobDownload(data.code, downloadName, 'application/javascript');
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Obfuscate';
        resetAltcha();
      });`,
  });
}
