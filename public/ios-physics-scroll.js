/*!
 * ios-physics-scroll.js  v1.0
 * The two ideas from the "why does iOS feel so nice" video, as plain JavaScript:
 *
 *  1) RUBBER-BANDING (pulling past the end of the page).
 *       offset = (1 - 1 / ((c * x / d) + 1)) * d
 *         x = how far the finger/wheel has pulled past the edge (raw distance)
 *         d = the size of the scroll view (video example: 844pt, one screen height)
 *         c = rubber-band coefficient, 0.55 (shown on screen as
 *             "TouchRubberBandingCoefficient 0.55")
 *     The page follows your finger less and less the further you pull, and can
 *     never move more than one screen (d) no matter how far you pull.
 *
 *  2) SPRING ANIMATION (what happens when you let go).
 *       m*x'' = -k*x - b*x'      (a damped harmonic oscillator)
 *     Animations are springs, not fixed-time curves, so they can be interrupted
 *     and keep the current VELOCITY (no jerk when you grab it mid-motion).
 *     Three presets are shown: .smooth, .snappy, .bouncy.
 *
 *  Source: values and formulas were read from the video's on-screen panels.
 *  Presets use Apple's documented duration/bounce -> stiffness/damping mapping
 *  (k = (2*PI/duration)^2 * m ; b = 4*PI*(1-bounce)/duration * m).
 *
 * ============================================================================
 *  INSTRUCTIONS FOR AI ASSISTANTS (read fully before changing anything)
 * ============================================================================
 *  GOAL: add iOS-style rubber-band overscroll + spring release to the site
 *  WITHOUT changing existing behavior. Additive and surgical only.
 *
 *  RULES
 *  1. Do NOT rewrite, reformat or remove existing HTML/CSS/JS. Only add.
 *  2. Add ONE line before </body> (or once in the shared layout):
 *         <script src="/ios-physics-scroll.js" defer></script>
 *  3. Wrap the page's main content in ONE element and give it the attribute
 *     data-ios-rubber. Do not rename or move existing elements. Keep
 *     position:fixed / sticky elements (header, bottom nav, floating buttons,
 *     live player controls) OUTSIDE this wrapper, because a transformed
 *     parent changes how fixed children behave while the page is being pulled.
 *  4. Add data-no-smooth to anything that must keep pure native scrolling
 *     (video player, map, canvas, iframe, chat feed). Inner scrollable panels
 *     are detected automatically and are never hijacked.
 *  5. On real iPhones/iPads the browser already rubber-bands natively, so
 *     touch handling is OFF there by default (touchOnIOS:false). Do not turn it
 *     on unless asked. Android/desktop get the effect.
 *  6. Do not load together with another physics/smooth-scroll library.
 *  7. Optional config BEFORE the script tag:
 *         <script>window.IOS_PHYSICS_OPTIONS = { preset: 'snappy' };</script>
 *
 *  API:  IOSPhysics.rubberBand(x, d, c)         the formula above
 *        IOSPhysics.spring(opts)                generic velocity-preserving spring
 *        IOSPhysics.scrollTo(y, presetOrOpts)   spring-driven page scroll
 *        IOSPhysics.init(opts) / destroy()
 *
 *  TEST CHECKLIST: pull past top and bottom with wheel/touch (resists, then
 *  springs back); grab it mid-bounce (no jump); normal scrolling unchanged;
 *  fixed header does not shift; modals/chat/video scroll normally; reduced
 *  motion users get no effect.
 *  ROLLBACK: remove the script line (the wrapper attribute is harmless).
 * ============================================================================
 */
(function () {
  'use strict';
  if (window.IOSPhysics) return;

  var PRESETS = {
    smooth: { duration: 0.5, bounce: 0 },
    snappy: { duration: 0.5, bounce: 0.15 },
    bouncy: { duration: 0.5, bounce: 0.3 }
  };
  var DEFAULTS = {
    preset: 'smooth',
    coefficient: 0.55,          // rubber-band c from the video
    wheelGain: 0.6,             // how strongly wheel/trackpad pulls past the edge
    releaseDelay: 90,           // ms without wheel input before springing back
    wrapperSelector: '[data-ios-rubber]',
    skipSelectors: '[data-no-smooth], video, iframe, canvas, textarea, input, select, [contenteditable="true"]',
    touchOnIOS: false
  };

  /* ---------- the math ---------- */
  function rubberBand(x, d, c) {
    c = c == null ? DEFAULTS.coefficient : c;
    if (x <= 0) return 0;
    return (1 - 1 / ((c * x) / d + 1)) * d;
  }
  function rubberBandInverse(y, d, c) { // raw pull distance that produces offset y
    c = c == null ? DEFAULTS.coefficient : c;
    y = Math.min(Math.abs(y), d * 0.9999);
    return (d / c) * (1 / (1 - y / d) - 1);
  }
  function springParams(p) {
    if (typeof p === 'string') p = PRESETS[p] || PRESETS.smooth;
    if (p.stiffness != null) return { m: p.mass || 1, k: p.stiffness, b: p.damping };
    var m = 1, w = (2 * Math.PI) / (p.duration || 0.5);
    return { m: m, k: w * w * m, b: ((4 * Math.PI * (1 - (p.bounce || 0))) / (p.duration || 0.5)) * m };
  }

  /* Velocity-preserving spring. opts: {from,to,velocity,preset,onUpdate,onDone}
     Returns {cancel(), velocity()} so a new spring can start from the live velocity. */
  function spring(o) {
    var P = springParams(o.preset || o.params || 'smooth');
    var x = o.from, v = o.velocity || 0, to = o.to, last = 0, raf = 0, alive = true;
    function step(t) {
      if (!alive) return;
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 1 / 60;
      last = t;
      var n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (var i = 0; i < n; i++) {         // semi-implicit Euler: stable for stiff springs
        var a = (-P.k * (x - to) - P.b * v) / P.m;
        v += a * h; x += v * h;
      }
      if (Math.abs(x - to) < 0.05 && Math.abs(v) < 0.05) {
        x = to; v = 0; alive = false; o.onUpdate && o.onUpdate(x, v); o.onDone && o.onDone(); return;
      }
      o.onUpdate && o.onUpdate(x, v);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return { cancel: function () { alive = false; cancelAnimationFrame(raf); }, velocity: function () { return v; } };
  }

  /* ---------- page integration ---------- */
  var cfg, started = false, wrap = null, offset = 0, raw = 0, edge = 0; // edge: +1 top, -1 bottom
  var anim = null, releaseTimer = 0, scrollAnim = null;
  var prevOff = 0, prevT = 0, vel = 0;
  var tStartY = 0, tEdge = 0, pulling = false, htmlOverscroll = '';
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function maxScroll() {
    var d = document.documentElement;
    return Math.max(0, Math.max(d.scrollHeight, document.body.scrollHeight) - window.innerHeight);
  }
  function atTop() { return window.scrollY <= 0; }
  function atBottom() { return window.scrollY >= maxScroll() - 1; }
  function viewSize() { return window.innerHeight; } // d

  function skip(el, dy) {
    for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.matches && n.matches(cfg.skipSelectors)) return true;
      var oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        if (dy > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return true;
      }
    }
    return false;
  }
  function locked() {
    return getComputedStyle(document.body).overflowY === 'hidden' ||
           getComputedStyle(document.documentElement).overflowY === 'hidden';
  }

  function apply(y) {
    var t = performance.now();
    if (prevT) vel = (y - prevOff) / Math.max((t - prevT) / 1000, 0.001);
    prevOff = y; prevT = t; offset = y;
    wrap.style.transform = y ? 'translate3d(0,' + y.toFixed(2) + 'px,0)' : '';
  }
  function stopAnim() { if (anim) { anim.cancel(); anim = null; } }

  function release() {
    clearTimeout(releaseTimer);
    if (!offset) { raw = 0; pulling = false; return; }
    stopAnim();
    anim = spring({
      from: offset, to: 0, velocity: vel * 0.6, preset: cfg.preset,
      onUpdate: function (x) { apply(x); },
      onDone: function () { anim = null; raw = 0; edge = 0; wrap.style.transform = ''; wrap.style.willChange = ''; vel = 0; prevT = 0; }
    });
    pulling = false;
  }

  function beginPull(dir) {
    stopAnim(); edge = dir;
    raw = offset ? rubberBandInverse(offset, viewSize()) : 0;
    wrap.style.willChange = 'transform';
  }
  function pull(delta) { // delta in raw pixels (positive = further past the edge)
    raw = Math.max(0, raw + delta);
    apply(edge * rubberBand(raw, viewSize(), cfg.coefficient));
  }

  function onWheel(e) {
    if (e.defaultPrevented || e.ctrlKey || reduce.matches || locked()) return;
    var dy = e.deltaY; if (!dy) return;
    if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= window.innerHeight;
    var want = offset > 0 ? 1 : offset < 0 ? -1 : (atTop() && dy < 0 ? 1 : atBottom() && dy > 0 ? -1 : 0);
    if (!want) return;                       // normal scrolling: do nothing
    if (!offset && skip(e.target, dy)) return;
    e.preventDefault();
    if (edge !== want || anim || !offset) beginPull(want);
    pull((want === 1 ? -dy : dy) * cfg.wheelGain);
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(release, cfg.releaseDelay);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    tStartY = e.touches[0].clientY; pulling = false;
    tEdge = atTop() ? 1 : atBottom() ? -1 : 0;
    if (offset) { // grabbed mid-bounce: continue from the current offset, no jump
      stopAnim(); tEdge = edge; raw = rubberBandInverse(offset, viewSize()); pulling = true;
      tStartY = e.touches[0].clientY - tEdge * raw;
    }
  }
  function onTouchMove(e) {
    if (reduce.matches || e.touches.length !== 1 || !tEdge) return;
    var dy = e.touches[0].clientY - tStartY, dist = tEdge === 1 ? dy : -dy;
    if (!pulling) {
      if (dist <= 0 || skip(e.target, -dy)) return;
      pulling = true; beginPull(tEdge); raw = 0;
    }
    if (dist <= 0) { raw = 0; apply(0); return; }
    if (e.cancelable) e.preventDefault();
    raw = dist; apply(edge * rubberBand(raw, viewSize(), cfg.coefficient));
  }
  function onTouchEnd() { if (pulling) release(); tEdge = 0; }

  /* ---------- public ---------- */
  function init(opts) {
    if (started) return;
    cfg = {}; var k, o = opts || window.IOS_PHYSICS_OPTIONS || {};
    for (k in DEFAULTS) cfg[k] = (k in o) ? o[k] : DEFAULTS[k];
    wrap = document.querySelector(cfg.wrapperSelector);
    if (!wrap) return;                       // nothing opted in: change nothing
    started = true;
    htmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'none'; // stop native pull-to-refresh fighting us
    window.addEventListener('wheel', onWheel, { passive: false });
    if (!isIOS || cfg.touchOnIOS) {
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }
  }
  function destroy() {
    if (!started) return; started = false;
    stopAnim(); clearTimeout(releaseTimer);
    window.removeEventListener('wheel', onWheel, { passive: false });
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove, { passive: false });
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    document.documentElement.style.overscrollBehaviorY = htmlOverscroll;
    if (wrap) { wrap.style.transform = ''; wrap.style.willChange = ''; }
    offset = raw = edge = 0;
  }
  function scrollTo(y, preset) { // spring-driven page scroll (back-to-top, anchors)
    y = Math.max(0, Math.min(y, maxScroll()));
    if (scrollAnim) scrollAnim.cancel();
    if (reduce.matches) { window.scrollTo(0, y); return; }
    scrollAnim = spring({
      from: window.scrollY, to: y, preset: preset || (cfg && cfg.preset) || 'smooth',
      onUpdate: function (v) { try { window.scrollTo({ top: v, behavior: 'instant' }); } catch (e) { window.scrollTo(0, v); } },
      onDone: function () { scrollAnim = null; }
    });
  }

  window.IOSPhysics = { init: init, destroy: destroy, rubberBand: rubberBand, spring: spring, scrollTo: scrollTo, presets: PRESETS };

  if (!window.IOS_PHYSICS_MANUAL) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
    else init();
  }
})();
