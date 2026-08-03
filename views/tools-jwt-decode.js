import { renderToolPage } from "./tool-page.js";

export function renderJwtDecode(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsJwtDecode",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1.4"/></svg>`,
    heading: "JWT Decoder",
    subtitle: "Decode a JSON Web Token's header and payload. This only decodes — it never verifies the signature or trusts the token.",
    bodyHtml: `
      <div class="field">
        <label for="tokenInput">JWT</label>
        <textarea id="tokenInput" rows="5" placeholder="eyJhbGciOi..." spellcheck="false"></textarea>
      </div>`,
    script: `
      var tokenInput = document.getElementById('tokenInput');
      setExtraValid(false);
      tokenInput.addEventListener('input', function(){ setExtraValid(tokenInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Decoding…';
        try {
          var data = await postTool('/api/tools/jwt-decode', { token: tokenInput.value.trim() });
          var pretty = 'Header:\\n' + JSON.stringify(data.header, null, 2) + '\\n\\nPayload:\\n' + JSON.stringify(data.payload, null, 2) +
            (data.signaturePresent ? '' : '\\n\\n(No signature segment present.)');
          resultEl.innerHTML = '<div class="result-head"><span>Decoded</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(pretty) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(pretty).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Decode';
        resetAltcha();
      });`,
  });
}
