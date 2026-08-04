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
      '@media (hover:hover) and (pointer:fine){' +
        'button:hover,[role="button"]:hover,.btn:hover,a.btn:hover{animation:etWibble .36s cubic-bezier(.36,.07,.19,.97) both}' +
      '}' +
      '@keyframes etLightTap{' +
        '0%{transform:translate(-50%,-50%) scale(0);opacity:.75}' +
        '100%{transform:translate(-50%,-50%) scale(1);opacity:0}' +
      '}' +
      '.et-light{' +
        'position:absolute;top:0;left:0;border-radius:50%;pointer-events:none;z-index:2;' +
        'background:radial-gradient(circle,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 72%);' +
        'transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'animation:etLightTap .55s ease-out forwards' +
      '}' +
      '@media (prefers-reduced-motion:reduce){' +
        '.et-wibble{animation:none}' +
        'button:hover,[role="button"]:hover,.btn:hover,a.btn:hover{animation:none}' +
        '.et-light{display:none}' +
      '}';
    document.head.appendChild(style);
  }

  var SELECTOR = 'button,[role="button"],.btn,a.btn';
  var audioCtx = null;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function spawnLightTap(el, evt) {
    if (reduceMotion) return;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = evt.clientX ? evt.clientX - rect.left : rect.width / 2;
    var y = evt.clientY ? evt.clientY - rect.top : rect.height / 2;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow !== 'hidden') el.style.overflow = 'hidden';
    var size = Math.max(rect.width, rect.height) * 1.5;
    var light = document.createElement('span');
    light.className = 'et-light';
    light.style.width = size + 'px';
    light.style.height = size + 'px';
    light.style.left = x + 'px';
    light.style.top = y + 'px';
    el.appendChild(light);
    var cleanup = function () { if (light.parentNode) light.parentNode.removeChild(light); };
    light.addEventListener('animationend', cleanup);
    setTimeout(cleanup, 700);
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!el || el.disabled) return;
    el.classList.remove('et-wibble');
    void el.offsetWidth;
    el.classList.add('et-wibble');
    playWibbleSound();
    spawnLightTap(el, e);
  }, { capture: true, passive: true });
})();
