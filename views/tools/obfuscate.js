import { renderToolPage } from "./page-shell.js";

export function renderObfuscate(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsObfuscate",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-12M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>`,
    heading: "JavaScript Obfuscator",
    subtitle: "Paste JavaScript code and get back an obfuscated version — control-flow flattening, string encoding, self-defending code.",
    bodyHtml: `
      <div class="field">
        <label for="codeInput">JavaScript Code</label>
        <textarea id="codeInput" rows="9" placeholder="function greet(name) { return 'Hello, ' + name; }" spellcheck="false"></textarea>
      </div>`,
    script: `
      var codeInput = document.getElementById('codeInput');
      setExtraValid(false);
      codeInput.addEventListener('input', function(){ setExtraValid(codeInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Obfuscating…';
        try {
          var data = await postTool('/api/tools/obfuscate', { code: codeInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Obfuscated Code</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.code) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.code).catch(function(){});
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
