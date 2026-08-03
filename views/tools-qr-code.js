import { renderToolPage } from "./tool-page.js";

export function renderQrCode(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsQrCode",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01"/></svg>`,
    heading: "QR Code Generator",
    subtitle: "Turn any text or URL into a scannable QR code.",
    bodyHtml: `
      <div class="field">
        <label for="textInput">Text or URL</label>
        <input type="text" id="textInput" placeholder="https://example.com" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var textInput = document.getElementById('textInput');
      setExtraValid(false);
      textInput.addEventListener('input', function(){ setExtraValid(textInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/qr-code', { text: textInput.value.trim() });
          resultEl.innerHTML = '<div class="result-head"><span>QR Code</span><a class="copy-btn" download="qr-code.png" href="' + data.dataUrl + '">Download</a></div>' +
            '<img class="result-img" src="' + data.dataUrl + '" alt="Generated QR code">';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
