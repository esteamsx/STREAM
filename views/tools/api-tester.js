import { renderToolPage } from "./page-shell.js";

export function renderApiTester(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsApiTester",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>`,
    heading: "API Request Tester",
    subtitle: "Send an HTTP request straight from your browser and inspect the response. Runs entirely client-side, so the target API's CORS policy applies — just like calling it from your own app.",
    bodyHtml: `
      <div class="field-row">
        <div class="field" style="flex:0 0 110px">
          <label for="methodSelect">Method</label>
          <select id="methodSelect">
            <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>HEAD</option>
          </select>
        </div>
        <div class="field">
          <label for="urlInput">URL</label>
          <input type="text" id="urlInput" placeholder="https://api.example.com/data">
        </div>
      </div>
      <div class="field">
        <label for="headersInput">Headers (one per line, key: value)</label>
        <textarea id="headersInput" rows="3" placeholder="Content-Type: application/json"></textarea>
      </div>
      <div class="field">
        <label for="bodyInput">Body</label>
        <textarea id="bodyInput" rows="5" placeholder='{"example":true}'></textarea>
      </div>`,
    script: `
      var methodSelect = document.getElementById('methodSelect');
      var urlInput = document.getElementById('urlInput');
      var headersInput = document.getElementById('headersInput');
      var bodyInput = document.getElementById('bodyInput');
      setExtraValid(false);
      urlInput.addEventListener('input', function(){ setExtraValid(/^https?:\\/\\/.+/i.test(urlInput.value.trim())); });

      function parseHeaders(text){
        var headers = {};
        text.split('\\n').forEach(function(line){
          var idx = line.indexOf(':');
          if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        });
        return headers;
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Sending…';
        try {
          await postTool('/api/tools/api-tester-gate', {});
          var method = methodSelect.value;
          var opts = { method: method, headers: parseHeaders(headersInput.value) };
          if (method !== 'GET' && method !== 'HEAD' && bodyInput.value.trim()) opts.body = bodyInput.value;
          var started = performance.now();
          var res = await fetch(urlInput.value.trim(), opts);
          var elapsed = Math.round(performance.now() - started);
          var text = await res.text();
          var headerLines = [];
          res.headers.forEach(function(v, k){ headerLines.push(k + ': ' + v); });
          var statusColor = res.ok ? 'var(--green)' : 'var(--red)';
          resultEl.innerHTML = '<div class="result-head"><span>Response</span><button class="copy-btn" id="copyResultBtn" type="button">Copy Body</button></div>' +
            '<p style="font-size:.85rem;margin-bottom:8px"><b style="color:' + statusColor + '">' + res.status + ' ' + esc(res.statusText) + '</b> · ' + elapsed + 'ms</p>' +
            '<pre class="result-pre" style="max-height:140px;margin-bottom:10px">' + esc(headerLines.join('\\n') || '(no headers)') + '</pre>' +
            '<pre class="result-pre">' + esc(text || '(empty body)') + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(text).catch(function(){});
          });
        } catch (err) {
          showMsg('Request failed — this is often the target API blocking cross-origin requests (CORS), not a bug here. ' + (err.message || ''), false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
        resetAltcha();
      });`,
  });
}
