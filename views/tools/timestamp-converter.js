import { renderToolPage } from "./page-shell.js";

export function renderTimestampConverter(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTimestampConverter",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>`,
    heading: "Timestamp Converter",
    subtitle: "Convert between Unix timestamps and human-readable dates.",
    bodyHtml: `
      <div class="field" style="text-align:center">
        <label>Current Unix Timestamp</label>
        <div id="nowTimestamp" style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent)">—</div>
      </div>
      <div class="field">
        <label for="modeSelect">Direction</label>
        <select id="modeSelect">
          <option value="toDate">Timestamp → Date</option>
          <option value="toTimestamp">Date → Timestamp</option>
        </select>
      </div>
      <div class="field" id="timestampField">
        <label for="timestampInput">Unix Timestamp (seconds or milliseconds)</label>
        <input type="text" id="timestampInput" placeholder="1700000000" autocomplete="off" spellcheck="false">
      </div>
      <div class="field" id="dateField" style="display:none">
        <label for="dateInput">Date (any parseable format)</label>
        <input type="text" id="dateInput" placeholder="2026-08-03T12:00:00Z" autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var nowTimestamp = document.getElementById('nowTimestamp');
      var modeSelect = document.getElementById('modeSelect');
      var timestampField = document.getElementById('timestampField');
      var dateField = document.getElementById('dateField');
      var timestampInput = document.getElementById('timestampInput');
      var dateInput = document.getElementById('dateInput');

      function tick(){ nowTimestamp.textContent = Math.floor(Date.now() / 1000); }
      tick();
      setInterval(tick, 1000);

      function checkValid(){
        setExtraValid(modeSelect.value === 'toDate' ? timestampInput.value.trim().length > 0 : dateInput.value.trim().length > 0);
      }
      modeSelect.addEventListener('change', function(){
        var toDate = modeSelect.value === 'toDate';
        timestampField.style.display = toDate ? 'block' : 'none';
        dateField.style.display = toDate ? 'none' : 'block';
        checkValid();
      });
      timestampInput.addEventListener('input', checkValid);
      dateInput.addEventListener('input', checkValid);
      setExtraValid(false);

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Converting…';
        try {
          var payload = { mode: modeSelect.value };
          if (modeSelect.value === 'toDate') payload.timestamp = timestampInput.value.trim();
          else payload.dateString = dateInput.value.trim();
          var data = await postTool('/api/tools/timestamp', payload);
          var rows = [
            ['ISO 8601', data.iso],
            ['UTC', data.utc],
            ['Unix Seconds', data.unixSeconds],
            ['Unix Milliseconds', data.unixMillis],
          ];
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){
              return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
            }).join('') + '</table>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Convert';
        resetAltcha();
      });`,
  });
}
