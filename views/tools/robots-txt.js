import { renderToolPage } from "./page-shell.js";

export function renderRobotsTxt(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsRobotsTxt",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="8" width="16" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 8V6a3 3 0 016 0v2M9 13h.01M15 13h.01"/></svg>`,
    heading: "robots.txt Generator",
    subtitle: "Build a robots.txt file that tells search engine crawlers which parts of your site they can and can't access.",
    bodyHtml: `
      <div id="rulesContainer"></div>
      <button class="copy-btn" id="addRuleBtn" type="button" style="margin-bottom:14px">+ Add User-agent Rule</button>
      <div class="field">
        <label for="sitemapInput">Sitemap URL (optional)</label>
        <input type="text" id="sitemapInput" placeholder="https://example.com/sitemap.xml">
      </div>`,
    extraStyle: `
      .rule-block{background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;padding:14px;margin-bottom:12px}
      .rule-block-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      .rule-remove{background:none;border:none;color:var(--red);font-size:.72rem;font-weight:600;cursor:pointer}
    `,
    script: `
      var rulesContainer = document.getElementById('rulesContainer');
      var addRuleBtn = document.getElementById('addRuleBtn');
      var sitemapInput = document.getElementById('sitemapInput');
      var ruleCount = 0;

      function addRule(agent){
        ruleCount++;
        var id = ruleCount;
        var block = document.createElement('div');
        block.className = 'rule-block';
        block.setAttribute('data-rule-id', id);
        block.innerHTML =
          '<div class="rule-block-head"><label style="margin:0">User-agent Block</label><button type="button" class="rule-remove">Remove</button></div>' +
          '<div class="field"><label>User-agent</label><input type="text" class="agentInput" value="' + (agent || '*') + '"></div>' +
          '<div class="field"><label>Disallow (one path per line)</label><textarea class="disallowInput" rows="2" placeholder="/admin/&#10;/private/"></textarea></div>' +
          '<div class="field" style="margin-bottom:0"><label>Allow (one path per line)</label><textarea class="allowInput" rows="2" placeholder="/public/"></textarea></div>';
        rulesContainer.appendChild(block);
        block.querySelector('.rule-remove').addEventListener('click', function(){
          block.remove();
          checkValid();
        });
        block.querySelectorAll('input,textarea').forEach(function(el){ el.addEventListener('input', checkValid); });
        checkValid();
      }
      addRuleBtn.addEventListener('click', function(){ addRule('*'); });
      addRule('*');

      function checkValid(){ setExtraValid(rulesContainer.children.length > 0); }
      setExtraValid(true);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Generating…';
        try {
          var rules = Array.prototype.map.call(rulesContainer.children, function(block){
            return {
              agent: block.querySelector('.agentInput').value,
              disallow: block.querySelector('.disallowInput').value.split('\\n').map(function(l){ return l.trim(); }).filter(Boolean),
              allow: block.querySelector('.allowInput').value.split('\\n').map(function(l){ return l.trim(); }).filter(Boolean),
            };
          });
          var data = await postTool('/api/tools/robots-txt', { rules: rules, sitemapUrl: sitemapInput.value.trim() });
          resultEl.innerHTML = '<div class="result-head"><span>robots.txt</span><span style="display:flex;gap:6px"><button class="copy-btn" id="copyResultBtn" type="button">Copy</button><button class="copy-btn" id="dlResultBtn" type="button">Download</button></span></div>' +
            '<pre class="result-pre">' + esc(data.output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(data.output).catch(function(){});
          });
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerBlobDownload(data.output, 'robots.txt', 'text/plain');
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
