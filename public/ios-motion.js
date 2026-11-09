(function(){
  'use strict';
  if (window.__ESIOSMotion) return;
  window.__ESIOSMotion = true;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.querySelector('[data-ios-rubber]') || document.querySelector('main') || document.body;
  if (!root) return;

  var style = document.createElement('style');
  style.id = 'es-ios-motion-style';
  style.textContent = '\
@keyframes esIosScrollGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}\
@keyframes esIosSoftPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.08)}}\
#esIosScrollProgress{position:fixed;top:0;left:0;width:100%;height:2px;z-index:1001;pointer-events:none;transform:scaleX(0);transform-origin:0 50%;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 12px color-mix(in srgb,var(--accent) 55%,transparent);}\
.ios-motion-enabled #esIosScrollProgress{animation:esIosScrollGrow linear;animation-timeline:scroll(root block)}\
.ios-motion-enabled .es-ios-motion-item{opacity:0;transform:translateY(14px) scale(.985);transition:opacity .52s cubic-bezier(.22,.61,.36,1),transform .62s cubic-bezier(.22,.61,.36,1);will-change:opacity,transform;}\
.ios-motion-enabled .es-ios-motion-item.es-ios-visible{opacity:1;transform:none;}\
.ios-motion-enabled button:not([data-no-smooth]),.ios-motion-enabled a:not([data-no-smooth]){transition:transform .18s cubic-bezier(.22,.61,.36,1),filter .18s ease;}\
.ios-motion-enabled button:not([data-no-smooth]):active,.ios-motion-enabled a:not([data-no-smooth]):active{transform:scale(.97);}\
@media(prefers-reduced-motion:reduce){#esIosScrollProgress{display:none!important}.es-ios-motion-item{opacity:1!important;transform:none!important;transition:none!important}}';
  (document.head || document.documentElement).appendChild(style);

  var progress = document.createElement('div');
  progress.id = 'esIosScrollProgress';
  document.body.appendChild(progress);

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
})();
