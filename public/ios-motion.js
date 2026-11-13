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

  var overviewStyle = document.createElement('style');
  overviewStyle.id = 'es-page-overview-style';
  overviewStyle.textContent = '\
#esPageOverview{position:fixed;inset:0;z-index:11000;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 16px max(14px,env(safe-area-inset-bottom));box-sizing:border-box;color:var(--text,#f3f3fa);background:linear-gradient(155deg,rgba(255,255,255,.11),rgba(255,255,255,.025) 42%,rgba(255,255,255,.065)),rgba(10,10,16,.84);backdrop-filter:blur(26px) saturate(155%);-webkit-backdrop-filter:blur(26px) saturate(155%);border:1px solid rgba(255,255,255,.16);opacity:0;visibility:hidden;pointer-events:none;transform:scale(.975);transform-origin:center;transition:opacity .24s ease,transform .42s cubic-bezier(.22,.8,.25,1.12),visibility .24s;touch-action:pan-y;overscroll-behavior:contain;}\
#esPageOverview.show{opacity:1;visibility:visible;pointer-events:auto;transform:none;}\
#esPageOverview .es-overview-header{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:980px;width:100%;margin:0 auto 14px;padding:2px 2px 0;}\
#esPageOverview .es-overview-title{font:700 1.08rem/1.2 var(--font-display,system-ui);letter-spacing:-.02em;}\
#esPageOverview .es-overview-hint{font:500 .72rem/1.4 var(--font-body,system-ui);color:var(--muted,rgba(255,255,255,.62));margin-top:3px;}\
#esPageOverview .es-overview-close{flex:0 0 40px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--text,#fff);background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.18);font-size:1.3rem;cursor:pointer;}\
#esPageOverview .es-overview-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;padding:2px 2px 18px;}\
#esPageOverview .es-overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(132px,clamp(132px,24vh,190px));gap:clamp(8px,2vw,14px);width:100%;max-width:980px;margin:0 auto;align-content:start;}\
#esPageOverview .es-overview-card{position:relative;display:flex;min-width:0;flex-direction:column;gap:8px;padding:8px;border-radius:16px;overflow:hidden;text-align:left;text-decoration:none;color:inherit;background:linear-gradient(150deg,rgba(255,255,255,.13),rgba(255,255,255,.035) 52%,rgba(255,255,255,.07)),rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 22px rgba(0,0,0,.12);transition:transform .22s cubic-bezier(.22,.8,.25,1.1),border-color .2s,background .2s;touch-action:pan-y;}\
:root[data-theme=light] #esPageOverview .es-overview-card{background:linear-gradient(150deg,rgba(255,255,255,.82),rgba(255,255,255,.45)),rgba(255,255,255,.48);border-color:rgba(255,255,255,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 8px 22px rgba(20,20,28,.08);}\
#esPageOverview .es-overview-card:active{transform:scale(.97);}\
#esPageOverview .es-overview-card[aria-current=page]{border-color:var(--accent,#00e0ff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent,#00e0ff) 40%,transparent),0 8px 24px rgba(0,224,255,.12);}\
#esPageOverview .es-overview-preview{position:relative;display:flex;flex:1;min-height:0;flex-direction:column;justify-content:flex-end;gap:5px;padding:8px;border-radius:10px;overflow:hidden;background:linear-gradient(140deg,rgba(0,224,255,.1),rgba(124,92,255,.08) 48%,rgba(255,255,255,.05));}\
#esPageOverview .es-overview-preview:before{content:"";position:absolute;left:8px;right:8px;top:8px;height:43%;border-radius:7px;background:linear-gradient(110deg,rgba(255,255,255,.07) 18%,rgba(255,255,255,.15) 34%,rgba(255,255,255,.07) 52%);background-size:220% 100%;animation:esOverviewShimmer 2.2s ease-in-out infinite;}\
#esPageOverview .es-overview-preview[data-layout="1"]:before{left:8px;right:34%;height:65%;}\
#esPageOverview .es-overview-preview[data-layout="2"]:before{left:34%;right:8px;height:58%;}\
#esPageOverview .es-overview-skeleton{position:relative;z-index:1;height:6px;border-radius:99px;background:rgba(255,255,255,.15);}\
#esPageOverview .es-overview-skeleton.wide{width:82%;}\
#esPageOverview .es-overview-skeleton.short{width:54%;}\
#esPageOverview .es-overview-label{font:650 clamp(.66rem,2.8vw,.8rem)/1.2 var(--font-body,system-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;}\
#esPageOverview .es-overview-current{position:absolute;top:12px;right:12px;z-index:2;padding:4px 7px;border-radius:99px;color:#04141a;background:var(--accent,#00e0ff);font:700 .55rem/1 var(--font-body,system-ui);letter-spacing:.04em;text-transform:uppercase;}\
#esPageOverview .es-overview-empty{grid-column:1/-1;padding:34px 12px;text-align:center;color:var(--muted,rgba(255,255,255,.65));font-size:.85rem;}\
#esPageOverview .es-overview-card.es-expanding{position:fixed;z-index:2;left:var(--es-card-left);top:var(--es-card-top);width:var(--es-card-width);height:var(--es-card-height);min-height:0;box-sizing:border-box;transition:left .34s cubic-bezier(.22,.8,.25,1.08),top .34s cubic-bezier(.22,.8,.25,1.08),width .34s cubic-bezier(.22,.8,.25,1.08),height .34s cubic-bezier(.22,.8,.25,1.08),border-radius .34s,opacity .25s;}\
#esPageOverview .es-overview-card.es-expanding.es-expanded{left:0;top:0;width:100vw;height:100dvh;border-radius:0;opacity:.35;}\
@keyframes esOverviewShimmer{0%,100%{background-position:100% 0}50%{background-position:0 0}}\
@media(max-width:360px){#esPageOverview{padding-left:10px;padding-right:10px}#esPageOverview .es-overview-card{padding:6px;border-radius:13px}}\
@media(prefers-reduced-motion:reduce){#esPageOverview,#esPageOverview .es-overview-card,#esPageOverview .es-overview-card.es-expanding{animation:none!important;transition:none!important}#esPageOverview .es-overview-preview:before{animation:none!important;background-position:0 0}}';
  overviewStyle.textContent += '\
#esPageOverview{backdrop-filter:blur(18px) saturate(145%);-webkit-backdrop-filter:blur(18px) saturate(145%)}\
#esPageOverview .es-overview-card{content-visibility:auto;contain-intrinsic-size:132px}\
#esPageOverview .es-overview-preview:before{animation:none;background-size:auto}\
#esPageOverview .es-overview-skeleton{display:block}\
#esPageOverview .es-overview-card.es-expanding.es-expanded{height:100vh;height:100dvh}';
  (document.head || document.documentElement).appendChild(overviewStyle);

  var progress = document.createElement('div');
  progress.id = 'esIosScrollProgress';
  document.body.appendChild(progress);

  var pullRefresh = document.createElement('div');
  pullRefresh.className = 'es-ios-pull-refresh';
  pullRefresh.setAttribute('aria-hidden', 'true');
  pullRefresh.innerHTML = '<svg viewBox="0 0 52 52"><circle class="es-ios-pull-track" cx="26" cy="26" r="22"></circle><circle class="es-ios-pull-progress" cx="26" cy="26" r="22" pathLength="100"></circle><g transform="translate(12 12) scale(1.1667)"><g class="es-ios-pull-icon"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></g></g></svg><span class="es-ios-pull-label">Pull to refresh</span>';
  document.body.appendChild(pullRefresh);

  var OVERVIEW_FALLBACK_PAGES = [
    { href: '/', label: 'Home' },
    { href: '/live', label: 'Live TV' },
    { href: '/movies', label: 'Movies' },
    { href: '/football', label: 'Football' },
    { href: '/profile', label: 'Profile' },
    { href: '/tools', label: 'Tools' },
    { href: '/tools/trading', label: 'Trading' },
    { href: '/promote', label: 'Promote' },
    { href: '/giveaway', label: 'Giveaway' },
    { href: '/channel-react', label: 'Channel Reaction' },
    { href: '/chess', label: 'Chess' },
    { href: '/ludo', label: 'Ludo' },
    { href: '/whot', label: 'Whot' },
    { href: '/snakes', label: 'Snakes and Ladders' },
    { href: '/tictactoe', label: 'Tic-Tac-Toe' },
    { href: '/deploy-bot', label: 'Deploy Bot' },
    { href: '/developers', label: 'Developers' },
    { href: '/coding', label: 'Cod\\ng' },
    { href: '/account', label: 'Account' }
  ];

  function initPageOverview() {
    if (document.getElementById('esPageOverview')) return;

    var overlay = document.createElement('div');
    overlay.id = 'esPageOverview';
    overlay.className = 'es-page-overview page-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Page overview');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="es-overview-header"><div><div class="es-overview-title">Page overview</div><div class="es-overview-hint">Choose a page to continue</div></div><button type="button" class="es-overview-close" aria-label="Close overview">×</button></div><div class="es-overview-scroll"><div class="es-overview-grid" aria-label="Available pages"></div></div>';
    document.body.appendChild(overlay);

    var grid = overlay.querySelector('.es-overview-grid');
    var closeButton = overlay.querySelector('.es-overview-close');
    var open = false;
    var navigating = false;
    var focusBeforeOpen = null;
    var pinch = null;
    var overviewOpenDistance = 0;
    var ignorePinchUntilEnd = false;
    var OPEN_PINCH_RATIO = 0.72;
    var CLOSE_PINCH_RATIO = 1.28;

    function getDistance(touches) {
      if (!touches || touches.length < 2) return 0;
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function excluded(target) {
      if (!target || !target.closest) return true;
      var protectedSurface = target.closest('[data-no-overview],[data-no-status-swipe],video,iframe,canvas,input,textarea,select,[contenteditable],[role="slider"],[class*="game"],[class*="board"],[class*="player"],[class*="chat"],[class*="comment"],[class*="map"],.music-player,.st-panel,.st-full,.st-over,.page-overlay.show');
      if (protectedSurface) return true;
      var homeFeed = target.closest('.hm-feed-card');
      if (homeFeed) {
        var nestedNoSmooth = target.closest('[data-no-smooth]');
        return !!(nestedNoSmooth && nestedNoSmooth !== homeFeed);
      }
      return !!target.closest('[data-no-smooth],[class*="feed"]');
    }

    function touchesWithinOverview(touches) {
      if (!touches || touches.length !== 2) return false;
      for (var i = 0; i < touches.length; i++) {
        if (!touches[i].target || !overlay.contains(touches[i].target)) return false;
      }
      return true;
    }

    function touchesEnterExcludedSurface(touches) {
      if (!touches || touches.length !== 2) return true;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];
        var pointTarget = document.elementFromPoint ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
        if ((pointTarget && excluded(pointTarget)) || (touch.target && excluded(touch.target))) return true;
      }
      return false;
    }

    function collectPages() {
      var sources = Array.prototype.slice.call(document.querySelectorAll('#esMenuList a[data-es-href],#esBottomNav a[data-es-href]'));
      var pages = [];
      var seenPaths = Object.create(null);
      sources.forEach(function(anchor) {
        if (anchor.hidden || anchor.closest('[hidden]')) return;
        var url;
        try { url = new URL(anchor.href, window.location.href); } catch (e) { return; }
        if (url.origin !== window.location.origin || (url.protocol !== 'https:' && url.protocol !== 'http:')) return;
        var key = url.pathname.replace(/\/+$/, '') || '/';
        if (seenPaths[key]) return;
        var label = (anchor.textContent || anchor.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        if (!label) return;
        seenPaths[key] = true;
        pages.push({ href: url.pathname + url.search + url.hash, path: key, label: label });
      });
      if (!pages.length) {
        OVERVIEW_FALLBACK_PAGES.forEach(function(page) {
          pages.push({ href: page.href, path: page.href.replace(/\/+$/, '') || '/', label: page.label });
        });
      }
      return pages;
    }

    function routeForCurrentPage(pages) {
      var path = window.location.pathname.replace(/\/+$/, '') || '/';
      if (/^\/u\/[^/]+/.test(path)) path = '/profile';
      var best = null;
      pages.forEach(function(page) {
        if (page.path === path || (page.path !== '/' && path.indexOf(page.path + '/') === 0)) {
          if (!best || page.path.length > best.path.length) best = page;
        }
      });
      return best;
    }

    function makeCard(page, index, currentPage) {
      var card = document.createElement('a');
      card.className = 'es-overview-card';
      card.href = page.href;
      card.setAttribute('aria-label', page.label);
      if (currentPage === page) {
        card.setAttribute('aria-current', 'page');
        var current = document.createElement('span');
        current.className = 'es-overview-current';
        current.textContent = 'Current';
        card.appendChild(current);
      }
      var preview = document.createElement('span');
      preview.className = 'es-overview-preview';
      preview.setAttribute('aria-hidden', 'true');
      preview.dataset.layout = String(index % 3);
      ['wide', '', 'short'].forEach(function(size) {
        var line = document.createElement('span');
        line.className = 'es-overview-skeleton' + (size ? ' ' + size : '');
        preview.appendChild(line);
      });
      var label = document.createElement('span');
      label.className = 'es-overview-label';
      label.textContent = page.label;
      card.appendChild(preview);
      card.appendChild(label);
      return card;
    }

    function renderPages() {
      grid.textContent = '';
      var pages = collectPages();
      var currentPage = routeForCurrentPage(pages);
      if (!pages.length) {
        var empty = document.createElement('div');
        empty.className = 'es-overview-empty';
        empty.textContent = 'No pages are available in your menu.';
        grid.appendChild(empty);
        return;
      }
      pages.forEach(function(page, index) { grid.appendChild(makeCard(page, index, currentPage)); });
    }

    function showOverview(fromPinch, distance) {
      if (open || navigating) return;
      renderPages();
      focusBeforeOpen = document.activeElement;
      open = true;
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('show');
      document.documentElement.classList.add('es-page-overview-active');
      if (fromPinch) {
        overviewOpenDistance = distance || 0;
        if (window.ESIOSFeedback) window.ESIOSFeedback.tap();
      } else {
        var menuOverlay = document.getElementById('esMenuOverlay');
        if (menuOverlay) menuOverlay.classList.remove('show');
      }
      if (!fromPinch && closeButton.focus) {
        try { closeButton.focus({ preventScroll: true }); } catch (e) { closeButton.focus(); }
      }
    }

    function closeOverview(fromPinch) {
      if (!open || navigating) return;
      open = false;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('es-page-overview-active');
      if (fromPinch) ignorePinchUntilEnd = true;
      var restoreFocus = focusBeforeOpen;
      if (restoreFocus && restoreFocus.closest && restoreFocus.closest('#esMenuOverlay')) {
        var visibleMenuButton = document.querySelector('.es-menu-fab');
        if (!visibleMenuButton || !visibleMenuButton.getClientRects().length) visibleMenuButton = document.querySelector('#esBottomNav button[aria-label="Menu"]');
        restoreFocus = visibleMenuButton;
      }
      if (restoreFocus && restoreFocus.isConnected && restoreFocus.focus) {
        try { restoreFocus.focus({ preventScroll: true }); } catch (e) {}
      }
      focusBeforeOpen = null;
      if (fromPinch && window.ESIOSFeedback) window.ESIOSFeedback.tap();
    }

    function navigateFromCard(card) {
      if (navigating) return;
      var destination;
      try { destination = new URL(card.href, window.location.href); } catch (e) { return; }
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
        closeOverview(false);
        return;
      }
      navigating = true;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--es-card-left', rect.left + 'px');
      card.style.setProperty('--es-card-top', rect.top + 'px');
      card.style.setProperty('--es-card-width', rect.width + 'px');
      card.style.setProperty('--es-card-height', rect.height + 'px');
      card.classList.add('es-expanding');
      requestAnimationFrame(function() {
        requestAnimationFrame(function() { card.classList.add('es-expanded'); });
      });
      window.setTimeout(function() { window.location.assign(destination.href); }, reduceMotion ? 0 : 360);
    }

    closeButton.addEventListener('click', function() { closeOverview(false); });
    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) closeOverview(false);
    });
    grid.addEventListener('click', function(event) {
      var card = event.target.closest && event.target.closest('.es-overview-card');
      if (!card || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigateFromCard(card);
    });

    document.addEventListener('keydown', function(event) {
      if (open && event.key === 'Escape') { event.preventDefault(); closeOverview(false); }
    });
    document.addEventListener('gesturestart', function(event) {
      if (open && event.cancelable) event.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturechange', function(event) {
      if (open && event.cancelable) event.preventDefault();
    }, { passive: false });
    document.addEventListener('touchstart', function(event) {
      if (event.touches.length !== 2) { pinch = null; return; }
      var distance = getDistance(event.touches);
      if (!distance) { pinch = null; return; }
      if (open) {
        if (touchesWithinOverview(event.touches)) pinch = { mode: 'close', distance: distance };
        else if (pinch && pinch.mode === 'open') pinch.distance = overviewOpenDistance || distance;
        return;
      }
      if (excluded(event.target) || touchesEnterExcludedSurface(event.touches)) { pinch = null; return; }
      if (window.visualViewport && window.visualViewport.scale > 1.05) { pinch = null; return; }
      pinch = { mode: 'open', distance: distance, target: event.target };
    }, { passive: true });
    document.addEventListener('touchmove', function(event) {
      if (event.touches.length !== 2) return;
      var distance = getDistance(event.touches);
      if (ignorePinchUntilEnd) { if (event.cancelable) event.preventDefault(); return; }
      if (open) {
        if (event.cancelable) event.preventDefault();
        if (pinch && pinch.mode === 'close' && distance > pinch.distance * CLOSE_PINCH_RATIO) closeOverview(true);
        else if (pinch && pinch.mode === 'open' && overviewOpenDistance && distance > overviewOpenDistance * CLOSE_PINCH_RATIO) closeOverview(true);
        return;
      }
      if (!pinch || pinch.mode !== 'open' || excluded(pinch.target) || excluded(event.target) || touchesEnterExcludedSurface(event.touches)) return;
      if (distance < pinch.distance - 2 && event.cancelable) event.preventDefault();
      if (distance < pinch.distance * OPEN_PINCH_RATIO) showOverview(true, distance);
    }, { passive: false });
    document.addEventListener('touchend', function(event) {
      if (!event.touches || event.touches.length < 2) {
        pinch = null;
        ignorePinchUntilEnd = false;
        overviewOpenDistance = 0;
      }
    }, { passive: true });
    document.addEventListener('touchcancel', function() {
      pinch = null;
      ignorePinchUntilEnd = false;
      overviewOpenDistance = 0;
    }, { passive: true });

    window.ESIOSPageOverview = { open: function() { showOverview(false, 0); }, close: function() { closeOverview(false); } };
  }

  initPageOverview();

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
    return !!(target && target.closest && target.closest('[data-no-smooth],video,iframe,canvas,input,textarea,select,button,a,[class*="chat"],[class*="comment"],[class*="feed"],[class*="map"],.page-overlay,.music-player,#esPageOverview'));
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
