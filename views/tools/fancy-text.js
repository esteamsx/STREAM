import { renderToolPage } from "./page-shell.js";

export function renderFancyText(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsFancyText",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7V5h16v2M9 5v14m0 0h6M9 19H9"/></svg>`,
    heading: "Fancy Text Generator",
    subtitle: "Type some text and get it back in a bunch of stylish Unicode fonts: bold, italic, script, circled, small caps and more. Great for bios and usernames.",
    bodyHtml: `
      <div class="field">
        <label for="ftInput">Your Text</label>
        <input type="text" id="ftInput" placeholder="Type something…" autocomplete="off" spellcheck="false" maxlength="500">
      </div>`,
    extraStyle: `
      .ft-row{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        padding:10px 12px;border-bottom:1px solid var(--border);
      }
      .ft-row:last-child{border-bottom:none}
      .ft-row-name{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;flex-shrink:0;width:88px}
      .ft-row-text{flex:1;font-size:1.02rem;word-break:break-word;line-height:1.5}
      .ft-list{background:var(--dark3);border:1px solid var(--border);border-radius:10px;max-height:420px;overflow-y:auto}
    `,
    script: `
      var ftInput = document.getElementById('ftInput');
      setExtraValid(false);
      ftInput.addEventListener('input', function(){ setExtraValid(ftInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var data = await postTool('/api/tools/fancy-text', { text: ftInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Pick a Style</span></div>' +
            '<div class="ft-list">' + data.styles.map(function(s, i){
              return '<div class="ft-row"><span class="ft-row-name">' + esc(s.name) + '</span>' +
                '<span class="ft-row-text">' + esc(s.text) + '</span>' +
                '<button class="copy-btn" data-idx="' + i + '" type="button">Copy</button></div>';
            }).join('') + '</div>';
          showResult();
          Array.prototype.forEach.call(resultEl.querySelectorAll('.copy-btn'), function(btn){
            btn.addEventListener('click', function(){
              var s = data.styles[Number(btn.dataset.idx)];
              navigator.clipboard.writeText(s.text).catch(function(){});
              var original = btn.textContent;
              btn.textContent = 'Copied!';
              setTimeout(function(){ btn.textContent = original; }, 1200);
            });
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        resetAltcha();
      });`,
  });
}
