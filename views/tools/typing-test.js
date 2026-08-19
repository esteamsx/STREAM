import { renderToolPage } from "./page-shell.js";

export function renderTypingTest(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTypingTest",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" d="M7 9h.01M11 9h.01M15 9h.01M7 13h6"/></svg>`,
    heading: "Typing Speed Test",
    subtitle: "Test your typing speed and accuracy against a random passage.",
    bodyHtml: `
      <div class="field">
        <div id="typingPassage" style="background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;font-family:var(--font-mono);font-size:.88rem;line-height:1.8;margin-bottom:12px;min-height:70px">Click "Start Test" to get a passage.</div>
        <label for="typingInput">Type it here</label>
        <textarea id="typingInput" rows="4" placeholder="Waiting for test to start…" disabled spellcheck="false" autocomplete="off"></textarea>
      </div>`,
    extraStyle: `
      .ty-correct{color:var(--green)}
      .ty-wrong{color:var(--red);text-decoration:underline;text-decoration-color:rgba(255,59,92,.6)}
      .ty-pending{color:var(--muted)}`,
    script: `
      var passage = document.getElementById('typingPassage');
      var input = document.getElementById('typingInput');
      var startedAt = 0;
      var finished = false;
      setExtraValid(true);
      submitBtn.textContent = 'Start Test';

      var PASSAGES = [
        'The quick brown fox jumps over the lazy dog while the sun sets slowly behind the hills.',
        'Great things are never done by one person alone. They are done by a team of people working hard together.',
        'Success is not final, failure is not fatal, it is the courage to continue that truly counts.',
        'The only way to do great work is to love what you do, and to keep learning every single day.',
        'A journey of a thousand miles begins with a single step, so start today and never look back.',
      ];

      function renderPassage(target, typed){
        var html = '';
        for (var i = 0; i < target.length; i++) {
          var cls = 'ty-pending';
          if (i < typed.length) cls = typed[i] === target[i] ? 'ty-correct' : 'ty-wrong';
          html += '<span class="' + cls + '">' + esc(target[i]) + '</span>';
        }
        passage.innerHTML = html;
      }

      function finishTest(target, typed){
        finished = true;
        input.disabled = true;
        var elapsedMin = (Date.now() - startedAt) / 60000;
        var correctChars = 0;
        for (var i = 0; i < typed.length; i++) if (typed[i] === target[i]) correctChars++;
        var wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
        var accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;
        resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
          '<table class="result-table"><tr><td>Speed</td><td>' + wpm + ' WPM</td></tr>' +
          '<tr><td>Accuracy</td><td>' + accuracy + '%</td></tr>' +
          '<tr><td>Time</td><td>' + (Math.round(elapsedMin * 60)) + 's</td></tr></table>';
        showResult();
        submitBtn.textContent = 'Try Again';
        updateSubmitState();
      }

      input.addEventListener('input', function(){
        if (finished) return;
        var target = passage.dataset.target || '';
        var typed = input.value;
        renderPassage(target, typed);
        if (typed.length >= target.length) finishTest(target, typed);
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Starting…';
        try {
          await postTool('/api/tools/typing-test-gate', {});
          var target = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
          passage.dataset.target = target;
          renderPassage(target, '');
          input.value = '';
          input.disabled = false;
          input.placeholder = 'Start typing…';
          input.focus();
          finished = false;
          startedAt = Date.now();
          submitBtn.textContent = 'Test in progress…';
        } catch (err) {
          showMsg(err.message, false);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Start Test';
        }
        resetAltcha();
      });`,
  });
}
