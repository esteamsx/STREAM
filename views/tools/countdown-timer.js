import { renderToolPage } from "./page-shell.js";

export function renderCountdownTimer(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsCountdownTimer",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path stroke-linecap="round" d="M12 9v4l3 2M9 2h6"/></svg>`,
    heading: "Countdown Timer / Stopwatch",
    subtitle: "Set a countdown, or run a stopwatch — right in your browser. Complete the verification below, then press Start.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="countdown">Countdown</option>
          <option value="stopwatch">Stopwatch</option>
        </select>
      </div>
      <div class="field-row" id="countdownFields">
        <div class="field" style="flex:1"><label for="minInput">Minutes</label><input type="text" id="minInput" value="5" inputmode="numeric"></div>
        <div class="field" style="flex:1"><label for="secInput">Seconds</label><input type="text" id="secInput" value="0" inputmode="numeric"></div>
      </div>
      <div id="timerDisplay" style="text-align:center;font-family:var(--font-mono);font-size:2.6rem;font-weight:700;padding:20px 0;color:var(--accent)">05:00</div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var countdownFields = document.getElementById('countdownFields');
      var minInput = document.getElementById('minInput');
      var secInput = document.getElementById('secInput');
      var display = document.getElementById('timerDisplay');

      submitBtn.textContent = 'Start';

      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn';
      resetBtn.style.cssText = 'width:auto;flex:1;background:var(--card2);color:var(--text);margin-top:8px';
      resetBtn.textContent = 'Reset';
      submitBtn.parentNode.insertBefore(resetBtn, submitBtn.nextSibling);
      submitBtn.style.width = '100%';

      var gated = false;
      var timerHandle = null;
      var remainingMs = 0;
      var elapsedMs = 0;
      var running = false;

      function formatTime(ms){
        var totalSec = Math.max(0, Math.round(ms / 1000));
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      }
      function updateDisplay(){
        display.textContent = modeSelect.value === 'countdown' ? formatTime(remainingMs) : formatTime(elapsedMs);
      }
      function resetTimer(){
        clearInterval(timerHandle);
        running = false;
        gated = false;
        elapsedMs = 0;
        var mins = parseInt(minInput.value, 10) || 0;
        var secs = parseInt(secInput.value, 10) || 0;
        remainingMs = (mins * 60 + secs) * 1000;
        submitBtn.textContent = 'Start';
        hideMsg();
        updateDisplay();
      }
      modeSelect.addEventListener('change', function(){
        countdownFields.style.display = modeSelect.value === 'countdown' ? 'flex' : 'none';
        resetTimer();
      });
      minInput.addEventListener('input', function(){ if (!running) resetTimer(); });
      secInput.addEventListener('input', function(){ if (!running) resetTimer(); });
      resetBtn.addEventListener('click', resetTimer);
      resetTimer();

      function tick(){
        if (modeSelect.value === 'countdown') {
          remainingMs -= 200;
          if (remainingMs <= 0) {
            remainingMs = 0;
            updateDisplay();
            clearInterval(timerHandle);
            running = false;
            submitBtn.textContent = 'Start';
            showMsg("Time's up!", true);
            return;
          }
        } else {
          elapsedMs += 200;
        }
        updateDisplay();
      }

      submitBtn.addEventListener('click', async function(){
        if (running) {
          clearInterval(timerHandle);
          running = false;
          submitBtn.textContent = 'Resume';
          return;
        }
        if (!gated) {
          hideMsg();
          var original = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="btn-spinner"></span>Starting…';
          try {
            await postTool('/api/tools/countdown-gate', {});
            gated = true;
          } catch (err) {
            showMsg(err.message, false);
            submitBtn.disabled = false;
            submitBtn.textContent = original;
            return;
          }
        }
        if (modeSelect.value === 'countdown' && remainingMs <= 0) resetTimer();
        running = true;
        gated = true;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pause';
        timerHandle = setInterval(tick, 200);
      });`,
  });
}
