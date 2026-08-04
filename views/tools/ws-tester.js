import { renderToolPage } from "./page-shell.js";

export function renderWsTester(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsWsTester",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    heading: "WebSocket Tester",
    subtitle: "Connect to a WebSocket endpoint, send messages, and watch the live log — all from your browser.",
    bodyHtml: `
      <div class="field">
        <label for="wsUrlInput">WebSocket URL</label>
        <input type="text" id="wsUrlInput" placeholder="wss://echo.websocket.org">
      </div>
      <div id="wsLog" class="ws-log"></div>
      <div class="field-row" style="align-items:flex-end">
        <div class="field" style="margin-bottom:0"><input type="text" id="wsMsgInput" placeholder="Message to send…" disabled></div>
      </div>`,
    extraStyle: `
      .ws-log{background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px 12px;height:180px;overflow-y:auto;font-family:var(--font-mono);font-size:.75rem;line-height:1.7;margin-bottom:10px}
      .ws-log .sent{color:var(--accent)}
      .ws-log .recv{color:var(--green)}
      .ws-log .sys{color:var(--muted)}
    `,
    script: `
      var wsUrlInput = document.getElementById('wsUrlInput');
      var wsLog = document.getElementById('wsLog');
      var wsMsgInput = document.getElementById('wsMsgInput');
      var socket = null;
      setExtraValid(false);
      wsUrlInput.addEventListener('input', function(){ setExtraValid(/^wss?:\\/\\/.+/i.test(wsUrlInput.value.trim())); });

      function log(cls, text){
        var line = document.createElement('div');
        line.className = cls;
        line.textContent = text;
        wsLog.appendChild(line);
        wsLog.scrollTop = wsLog.scrollHeight;
      }

      wsMsgInput.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && socket && socket.readyState === 1 && wsMsgInput.value) {
          socket.send(wsMsgInput.value);
          log('sent', '→ ' + wsMsgInput.value);
          wsMsgInput.value = '';
        }
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg();
        if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
          socket.close();
          return;
        }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Connecting…';
        try {
          await postTool('/api/tools/ws-tester-gate', {});
          wsLog.innerHTML = '';
          log('sys', 'Connecting to ' + wsUrlInput.value.trim() + ' …');
          socket = new WebSocket(wsUrlInput.value.trim());
          socket.onopen = function(){
            log('sys', 'Connected.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Disconnect';
            wsMsgInput.disabled = false;
          };
          socket.onmessage = function(ev){ log('recv', '← ' + ev.data); };
          socket.onerror = function(){ log('sys', 'Connection error.'); };
          socket.onclose = function(){
            log('sys', 'Disconnected.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Connect';
            wsMsgInput.disabled = true;
            socket = null;
          };
        } catch (err) {
          showMsg(err.message, false);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Connect';
          resetAltcha();
        }
      });`,
  });
}
