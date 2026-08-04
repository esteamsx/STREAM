import { renderToolPage } from "./page-shell.js";

export function renderBaseConverter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsBaseConverter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    heading: "Number Base Converter",
    subtitle: "Convert numbers between binary, octal, decimal, hexadecimal, or any base 2–36.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:1">
          <label for="fromBase">From Base</label>
          <select id="fromBase">
            <option value="2">Binary (2)</option>
            <option value="8">Octal (8)</option>
            <option value="10" selected>Decimal (10)</option>
            <option value="16">Hex (16)</option>
          </select>
        </div>
        <div class="field" style="flex:1">
          <label for="toBase">To Base</label>
          <select id="toBase">
            <option value="2">Binary (2)</option>
            <option value="8">Octal (8)</option>
            <option value="10">Decimal (10)</option>
            <option value="16" selected>Hex (16)</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="numInput">Number</label>
        <input type="text" id="numInput" placeholder="255" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var fromBase = document.getElementById('fromBase');
      var toBase = document.getElementById('toBase');
      var numInput = document.getElementById('numInput');
      setExtraValid(false);
      numInput.addEventListener('input', function(){ setExtraValid(numInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var data = await postTool('/api/tools/base-convert', { input: numInput.value.trim(), fromBase: Number(fromBase.value), toBase: Number(toBase.value) });
          resultEl.innerHTML = '<div class="result-head"><span>Result</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
