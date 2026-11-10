(function(){
  'use strict';
  if (window.__ESIOSMotion) return;
  window.__ESIOSMotion = true;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.querySelector('[data-ios-rubber]') || document.querySelector('main') || document.body;
  if (!root) return;

  var lastTapHapticAt = 0;
  function vibrate(pattern){
    if (reduceMotion || !navigator || typeof navigator.vibrate !== 'function') return false;
    try { return navigator.vibrate(pattern) !== false; } catch (e) { return false; }
  }
  window.ESIOSFeedback = {
    tap: function(){
      var now = Date.now();
      if (now - lastTapHapticAt < 55) return false;
      lastTapHapticAt = now;
      return vibrate(8);
    },
    result: function(kind){ return vibrate(kind === 'error' ? [12, 28, 12] : [8, 22, 8]); }
  };
  document.addEventListener('click', function(event){
    if (!event.isTrusted || !event.target || !event.target.closest) return;
    var control = event.target.closest('button,a,[role="button"],[role="tab"],[role="menuitem"]');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    if (control.closest('input,textarea,select,[role="slider"],[data-no-haptic],video,iframe,canvas,[contenteditable="true"]')) return;
    window.ESIOSFeedback.tap();
  }, true);

  var style = document.createElement('style');
  style.id = 'es-ios-motion-style';
  style.textContent = '\
@keyframes esIosScrollGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}\
@keyframes esIosSoftPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.08)}}\
@keyframes esIosRefreshSpin{to{transform:rotate(360deg)}}\
@view-transition{navigation:auto;}\
::view-transition-old(root),::view-transition-new(root){animation-duration:.24s;animation-timing-function:cubic-bezier(.22,.61,.36,1)}\
#esIosScrollProgress{position:fixed;top:0;left:0;width:100%;height:2px;z-index:1001;pointer-events:none;transform:scaleX(0);transform-origin:0 50%;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 12px color-mix(in srgb,var(--accent) 55%,transparent);}\
.ios-motion-enabled #esIosScrollProgress{animation:esIosScrollGrow linear;animation-timeline:scroll(root block)}\
.es-ios-pull-refresh{position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;width:68px;height:68px;z-index:1002;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(155deg,rgba(255,255,255,.18),rgba(255,255,255,.05)),rgba(20,20,28,.68);border:1px solid rgba(255,255,255,.24);box-shadow:0 14px 34px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.24);backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);transform:translate(-50%,-150%) scale(.72);opacity:0;pointer-events:none;transition:transform .42s cubic-bezier(.22,.61,.36,1),opacity .22s ease;}\
.es-ios-pull-refresh.show{transform:translate(-50%,10px) scale(1);opacity:1;}\
.es-ios-pull-refresh svg{position:absolute;width:42px;height:42px;}\
.es-ios-pull-refresh .es-ios-pull-track{fill:none;stroke:rgba(255,255,255,.18);stroke-width:3.2;}\
.es-ios-pull-refresh .es-ios-pull-progress{fill:none;stroke:#ffd447;stroke-width:3.2;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke .18s ease;}\
.es-ios-pull-refresh .es-ios-pull-icon{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;transition:stroke .18s ease;}\
.es-ios-pull-refresh.ready .es-ios-pull-progress{stroke:#3ddc84;}\
.es-ios-pull-refresh.ready .es-ios-pull-icon{stroke:#3ddc84;}\
.es-ios-pull-refresh.refreshing .es-ios-pull-icon{animation:esIosRefreshSpin .8s linear infinite;}\
.es-ios-pull-refresh .es-ios-pull-label{position:absolute;top:72px;white-space:nowrap;color:var(--text);font-size:.68rem;font-weight:700;opacity:0;transform:translateY(-4px);transition:opacity .2s ease,transform .2s ease;}\
.es-ios-pull-refresh.show .es-ios-pull-label{opacity:.82;transform:none;}\
.ios-motion-enabled .es-ios-glass-item{position:relative;isolation:isolate;}\
.ios-motion-enabled .es-ios-glass-glow{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at var(--es-glass-x,50%) var(--es-glass-y,50%),rgba(255,255,255,.18),transparent 30%);opacity:0;mix-blend-mode:screen;transition:opacity .28s ease;}\
.ios-motion-enabled .es-ios-glass-item:hover .es-ios-glass-glow{opacity:.72;}\
.ios-motion-enabled .es-ios-glass-item > :not(.es-ios-glass-glow){position:relative;z-index:1;}\
.ios-motion-enabled .es-ios-glass-item button:hover > svg,.ios-motion-enabled .es-ios-glass-item a:hover > svg{transform:translateY(-1px) rotate(-3deg);}\
.ios-motion-enabled .es-ios-motion-item{opacity:0;transform:translateY(14px) scale(.985);transition:opacity .52s cubic-bezier(.22,.61,.36,1),transform .62s cubic-bezier(.22,.61,.36,1);will-change:opacity,transform;}\
.ios-motion-enabled .es-ios-motion-item.es-ios-visible{opacity:1;transform:none;}\
.ios-motion-enabled button:not([data-no-smooth]),.ios-motion-enabled a:not([data-no-smooth]){transition:transform .26s cubic-bezier(.34,1.35,.64,1),filter .18s ease;}\
.ios-motion-enabled button:not([data-no-smooth]):active,.ios-motion-enabled a:not([data-no-smooth]):active{transform:scale(.97);}\
@media(prefers-reduced-motion:reduce){#esIosScrollProgress{display:none!important}.es-ios-motion-item{opacity:1!important;transform:none!important;transition:none!important}::view-transition-group(root),::view-transition-image-pair(root),::view-transition-old(root),::view-transition-new(root){animation-duration:0s!important;animation-delay:0s!important}}';
  (document.head || document.documentElement).appendChild(style);

  var progress = document.createElement('div');
  progress.id = 'esIosScrollProgress';
  document.body.appendChild(progress);

  var pullRefresh = document.createElement('div');
  pullRefresh.className = 'es-ios-pull-refresh';
  pullRefresh.setAttribute('aria-hidden', 'true');
  pullRefresh.innerHTML = '<svg viewBox="0 0 52 52"><circle class="es-ios-pull-track" cx="26" cy="26" r="22"></circle><circle class="es-ios-pull-progress" cx="26" cy="26" r="22" pathLength="100"></circle><g transform="translate(12 12) scale(1.1667)"><g class="es-ios-pull-icon"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></g></g></svg><span class="es-ios-pull-label">Pull to refresh</span>';
  document.body.appendChild(pullRefresh);

  if (reduceMotion) return;
  document.documentElement.classList.add('ios-motion-enabled');

  var selector = 'section,article,.card,.dcard,.feature-card,.ad-card,.acc-card,.tool-card,.movie-card,.mv-card,.key-row,.hero,.hero-card';
  var items = Array.prototype.slice.call(root.querySelectorAll(selector)).filter(function(el){
    if (el.closest('[data-no-smooth],video,iframe,canvas,[class*="chat"],[class*="comment"],[class*="feed"],[class*="map"]')) return false;
    if (el.closest('.page-overlay,.music-player')) return false;
    return el.getBoundingClientRect().height > 0;
  });
  var seen = new Set();
  items.forEach(function(el, index){
    el.classList.add('es-ios-motion-item');
    el.style.transitionDelay = Math.min(index * 28, 180) + 'ms';
    if (window.matchMedia && window.matchMedia('(hover:hover)').matches) {
      el.classList.add('es-ios-glass-item');
      var glow = document.createElement('span');
      glow.className = 'es-ios-glass-glow';
      glow.setAttribute('aria-hidden', 'true');
      el.appendChild(glow);
      el.addEventListener('pointermove', function(event){
        if (event.pointerType === 'touch') return;
        var rect = el.getBoundingClientRect();
        el.style.setProperty('--es-glass-x', ((event.clientX - rect.left) / rect.width * 100) + '%');
        el.style.setProperty('--es-glass-y', ((event.clientY - rect.top) / rect.height * 100) + '%');
      });
      el.addEventListener('pointerleave', function(){
        el.style.setProperty('--es-glass-x', '50%');
        el.style.setProperty('--es-glass-y', '50%');
      });
    }
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        entry.target.classList.add('es-ios-visible');
        seen.add(entry.target);
        if (seen.size === items.length) observer.disconnect();
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(function(el){ observer.observe(el); });
  } else {
    items.forEach(function(el){ el.classList.add('es-ios-visible'); });
  }

  if (!window.CSS || !CSS.supports || !CSS.supports('animation-timeline: scroll(root block)')) {
    var ticking = false;
    var update = function(){
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function(){
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive:true });
    update();
  }

  var touchStartY = 0;
  var touchStartX = 0;
  var pullTracking = false;
  var pullActive = false;
  var pullComplete = false;
  var PULL_TRIGGER_PX = 28;
  var PULL_REFRESH_PX = 112;
  var progressCircle = pullRefresh.querySelector('.es-ios-pull-progress');
  var pullLabel = pullRefresh.querySelector('.es-ios-pull-label');
  var pullIcon = pullRefresh.querySelector('.es-ios-pull-icon');
  var pullExcluded = function(target){
    return !!(target && target.closest && target.closest('[data-no-smooth],video,iframe,canvas,input,textarea,select,button,a,[class*="chat"],[class*="comment"],[class*="feed"],[class*="map"],.page-overlay,.music-player'));
  };
  var resetPull = function(){
    pullActive = false;
    pullComplete = false;
    pullRefresh.classList.remove('show','ready','refreshing');
    pullIcon.style.transform = '';
    progressCircle.style.strokeDasharray = '0 100';
    progressCircle.style.stroke = '#ffd447';
    pullLabel.textContent = 'Pull to refresh';
  };
  var updatePull = function(distance){
    if (!pullActive) return;
    var amount = Math.min(1, Math.max(0, (distance - PULL_TRIGGER_PX) / (PULL_REFRESH_PX - PULL_TRIGGER_PX)));
    progressCircle.style.strokeDasharray = (amount * 100) + ' 100';
    pullIcon.style.transform = 'rotate(' + (amount * 180) + 'deg)';
    if (amount >= 1) {
      pullComplete = true;
      pullRefresh.classList.add('ready');
      progressCircle.style.stroke = '#3ddc84';
      pullLabel.textContent = 'Release to refresh';
    } else {
      pullComplete = false;
      pullRefresh.classList.remove('ready');
      progressCircle.style.stroke = '#ffd447';
      pullLabel.textContent = 'Pull to refresh';
    }
  };
  var beginPull = function(){
    pullActive = true;
    pullComplete = false;
    pullRefresh.classList.add('show');
  };
  document.addEventListener('touchstart', function(event){
    pullTracking = !reduceMotion && event.touches.length === 1 && window.scrollY <= 0 && !pullExcluded(event.target);
    if (!pullTracking) return;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }, { passive:true });
  document.addEventListener('touchmove', function(event){
    if (!pullTracking) return;
    if (reduceMotion || event.touches.length !== 1 || window.scrollY > 0 || pullExcluded(event.target)) {
      pullTracking = false;
      if (pullActive) resetPull();
      return;
    }
    var dy = event.touches[0].clientY - touchStartY;
    var dx = Math.abs(event.touches[0].clientX - touchStartX);
    if (dy <= 0 || dx > dy) {
      if (pullActive) { pullTracking = false; resetPull(); }
      return;
    }
    if (dy < PULL_TRIGGER_PX) {
      if (pullActive) { updatePull(dy); if (event.cancelable) event.preventDefault(); }
      return;
    }
    if (!pullActive) beginPull();
    updatePull(dy);
    if (event.cancelable) event.preventDefault();
  }, { passive:false });
  document.addEventListener('touchend', function(event){
    if (event.touches && event.touches.length) { pullTracking = false; if (pullActive) resetPull(); return; }
    pullTracking = false;
    if (!pullActive) return;
    if (pullComplete) {
      pullActive = false;
      pullRefresh.classList.add('refreshing');
      pullLabel.textContent = 'Refreshing…';
      if (window.ESIOSFeedback) window.ESIOSFeedback.result('success');
      setTimeout(function(){ window.location.reload(); }, 120);
    } else resetPull();
  }, { passive:true });
  document.addEventListener('touchcancel', function(){ pullTracking = false; resetPull(); }, { passive:true });
})();
