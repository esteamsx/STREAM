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
      '@media (prefers-reduced-motion:reduce){.et-wibble{animation:none}' +
        'button:hover,[role="button"]:hover,.btn:hover,a.btn:hover{animation:none}}' +
      '.et-glass-rel{position:relative}' +
      '.et-glass,.et-glass-tint{isolation:isolate}' +
      '.et-glass::before,.et-glass-tint::before{' +
        'content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;' +
        'background:linear-gradient(165deg,rgba(255,255,255,.16),rgba(255,255,255,0) 42%,rgba(0,0,0,.06) 100%);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.12)' +
      '}' +
      '.et-glass{' +
        'background:rgba(255,255,255,.07) !important;' +
        'backdrop-filter:blur(14px) saturate(180%);' +
        '-webkit-backdrop-filter:blur(14px) saturate(180%)' +
      '}';
    document.head.appendChild(style);
  }

  var SELECTOR = 'button,[role="button"],.btn,a.btn';
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

  function glassify(el) {
    if (!el.getAttribute || el.dataset.etGlass) return;
    el.dataset.etGlass = '1';
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.classList.add('et-glass-rel');
    var hasArt = cs.backgroundImage && cs.backgroundImage !== 'none';
    el.classList.add(hasArt ? 'et-glass-tint' : 'et-glass');
  }

  function glassifyTree(root) {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SELECTOR)) glassify(root);
    if (root.querySelectorAll) {
      var found = root.querySelectorAll(SELECTOR);
      for (var i = 0; i < found.length; i++) glassify(found[i]);
    }
  }

  glassifyTree(document.body);

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) glassifyTree(added[j]);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
