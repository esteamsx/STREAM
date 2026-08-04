(function () {
  var STYLE_ID = 'et-tap-feedback-style';
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '@keyframes etWibble{' +
        '0%{transform:scale(1) rotate(0deg)}' +
        '20%{transform:scale(.92,1.06) rotate(-3deg)}' +
        '45%{transform:scale(1.06,.94) rotate(3deg)}' +
        '70%{transform:scale(.97,1.03) rotate(-1.4deg)}' +
        '100%{transform:scale(1) rotate(0deg)}' +
      '}' +
      '.et-wibble{animation:etWibble .36s cubic-bezier(.36,.07,.19,.97) both}' +
      '@media (prefers-reduced-motion:reduce){.et-wibble{animation:none}}';
    document.head.appendChild(style);
  }

  var SELECTOR = 'button,[role="button"],.btn';
  var audioCtx = null;

  function playWibbleSound() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(680, t + 0.045);
      osc.frequency.linearRampToValueAtTime(340, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!el || el.disabled) return;
    el.classList.remove('et-wibble');
    void el.offsetWidth;
    el.classList.add('et-wibble');
    playWibbleSound();
  }, { capture: true, passive: true });
})();
