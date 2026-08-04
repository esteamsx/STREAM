import { renderToolPage } from "./page-shell.js";

export function renderMarkdownPreview(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsMarkdownPreview",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 15V9l3 3 3-3v6M17 9v6M14.5 12.5L17 15l2.5-2.5"/></svg>`,
    heading: "Markdown Previewer",
    subtitle: "Write Markdown and see the rendered HTML preview instantly.",
    bodyHtml: `
      <div class="field">
        <label for="mdInput">Markdown</label>
        <textarea id="mdInput" rows="10" placeholder="# Heading&#10;&#10;Some **bold** and *italic* text." spellcheck="false"></textarea>
      </div>`,
    extraStyle: `
      .md-preview{background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:16px 18px;max-height:420px;overflow-y:auto;font-size:.86rem;line-height:1.6}
      .md-preview h1,.md-preview h2,.md-preview h3,.md-preview h4,.md-preview h5,.md-preview h6{margin:14px 0 8px;font-family:var(--font-display)}
      .md-preview h1:first-child,.md-preview h2:first-child{margin-top:0}
      .md-preview p{margin:8px 0}
      .md-preview ul,.md-preview ol{margin:8px 0 8px 22px}
      .md-preview blockquote{border-left:3px solid var(--accent);padding-left:12px;color:var(--muted);margin:8px 0}
      .md-preview pre{background:var(--card2);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0}
      .md-preview code{font-family:var(--font-mono);font-size:.82em;background:var(--card2);padding:1px 5px;border-radius:4px}
      .md-preview pre code{background:none;padding:0}
      .md-preview hr{border:none;border-top:1px solid var(--border-strong);margin:14px 0}
      .md-preview a{color:var(--accent)}`,
    script: `
      var mdInput = document.getElementById('mdInput');
      setExtraValid(false);
      mdInput.addEventListener('input', function(){ setExtraValid(mdInput.value.trim().length > 0); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Rendering…';
        try {
          var data = await postTool('/api/tools/markdown-preview', { markdown: mdInput.value });
          resultEl.innerHTML = '<div class="result-head"><span>Preview</span></div><div class="md-preview">' + data.html + '</div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Preview';
        resetAltcha();
      });`,
  });
}
