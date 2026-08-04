import { renderToolPage } from "./page-shell.js";

export function renderFileTypeDetector(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsFileTypeDetector",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M6 3h8l5 5v13H6z"/><path stroke-linecap="round" d="M9 13h6M9 16h6"/></svg>`,
    heading: "File Type Detector",
    subtitle: "Detects a file's real format by inspecting its magic bytes, not just its extension. Useful for catching mislabeled or disguised files. Everything runs locally; nothing is uploaded.",
    bodyHtml: `
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fileInput">
        <div class="file-drop-label"><b>Click to upload</b> or drag any file here</div>
        <div class="file-drop-name" id="fileName"></div>
      </div>`,
    script: `
      var fileDrop = document.getElementById('fileDrop');
      var fileInput = document.getElementById('fileInput');
      var fileName = document.getElementById('fileName');
      var pendingFile = null;
      setExtraValid(false);

      var SIGNATURES = [
        { type: 'PNG image', mime: 'image/png', bytes: [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A] },
        { type: 'JPEG image', mime: 'image/jpeg', bytes: [0xFF,0xD8,0xFF] },
        { type: 'GIF image', mime: 'image/gif', bytes: [0x47,0x49,0x46,0x38] },
        { type: 'BMP image', mime: 'image/bmp', bytes: [0x42,0x4D] },
        { type: 'WebP image', mime: 'image/webp', bytes: [0x52,0x49,0x46,0x46], offset: 0, extraCheck: function(b){ return b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50; } },
        { type: 'PDF document', mime: 'application/pdf', bytes: [0x25,0x50,0x44,0x46] },
        { type: 'ZIP archive (or docx/xlsx/jar/apk)', mime: 'application/zip', bytes: [0x50,0x4B,0x03,0x04] },
        { type: 'RAR archive', mime: 'application/x-rar-compressed', bytes: [0x52,0x61,0x72,0x21,0x1A,0x07] },
        { type: '7-Zip archive', mime: 'application/x-7z-compressed', bytes: [0x37,0x7A,0xBC,0xAF,0x27,0x1C] },
        { type: 'GZIP archive', mime: 'application/gzip', bytes: [0x1F,0x8B] },
        { type: 'MP3 audio', mime: 'audio/mpeg', bytes: [0x49,0x44,0x33] },
        { type: 'WAV audio', mime: 'audio/wav', bytes: [0x52,0x49,0x46,0x46], extraCheck: function(b){ return b[8]===0x57&&b[9]===0x41&&b[10]===0x56&&b[11]===0x45; } },
        { type: 'OGG audio/video', mime: 'application/ogg', bytes: [0x4F,0x67,0x67,0x53] },
        { type: 'MP4 video', mime: 'video/mp4', bytes: [0x66,0x74,0x79,0x70], offset: 4 },
        { type: 'WebM/Matroska video', mime: 'video/webm', bytes: [0x1A,0x45,0xDF,0xA3] },
        { type: 'ELF executable', mime: 'application/x-elf', bytes: [0x7F,0x45,0x4C,0x46] },
        { type: 'Windows executable (EXE/DLL)', mime: 'application/x-msdownload', bytes: [0x4D,0x5A] },
        { type: 'SQLite database', mime: 'application/x-sqlite3', bytes: [0x53,0x51,0x4C,0x69,0x74,0x65,0x20,0x66,0x6F,0x72,0x6D,0x61,0x74,0x20,0x33,0x00] },
      ];

      function bytesMatch(bytes, offset, sig){
        var off = sig.offset || 0;
        for (var i = 0; i < sig.bytes.length; i++) {
          if (bytes[off + i] !== sig.bytes[i]) return false;
        }
        if (sig.extraCheck && !sig.extraCheck(bytes)) return false;
        return true;
      }

      function detect(bytes){
        for (var i = 0; i < SIGNATURES.length; i++) {
          if (bytesMatch(bytes, 0, SIGNATURES[i])) return SIGNATURES[i];
        }
        var isText = bytes.slice(0, 512).every(function(b){ return b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128; });
        if (isText) return { type: 'Plain text (or unrecognized text-based format)', mime: 'text/plain' };
        return null;
      }

      function toHex(bytes){
        return Array.prototype.map.call(bytes, function(b){ return b.toString(16).padStart(2, '0'); }).join(' ');
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
        fileName.textContent = file.name + ' (' + file.size + ' bytes)';
        pendingFile = file;
        setExtraValid(true);
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!pendingFile) { showMsg('Choose a file first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Analyzing…';
        try {
          await postTool('/api/tools/file-detect-gate', {});
          var buf = await pendingFile.slice(0, 32).arrayBuffer();
          var bytes = new Uint8Array(buf);
          var result = detect(bytes);
          var claimedExt = (pendingFile.name.split('.').pop() || '').toLowerCase();
          resultEl.innerHTML = '<div class="result-head"><span>Detection Result</span></div>' +
            '<table class="result-table">' +
            '<tr><td>Detected Type</td><td>' + (result ? esc(result.type) : 'Unknown / no matching signature') + '</td></tr>' +
            '<tr><td>MIME (guess)</td><td>' + (result ? esc(result.mime) : '-') + '</td></tr>' +
            '<tr><td>Filename Claims</td><td>.' + esc(claimedExt || '(none)') + ', ' + esc(pendingFile.type || 'unknown browser MIME') + '</td></tr>' +
            '<tr><td>First Bytes (hex)</td><td style="font-family:var(--font-mono);word-break:break-all">' + esc(toHex(bytes)) + '</td></tr>' +
            '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Detect File Type';
        resetAltcha();
      });`,
  });
}
