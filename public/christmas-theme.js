(() => {
  "use strict";

  // Flip this single flag to false after the seasonal period.
  const ENABLED = true;
  if (!ENABLED || window.__esChristmasThemeLoaded) return;
  window.__esChristmasThemeLoaded = true;

  const BRAND_SELECTORS = [
    ".hm-logo", ".mv-logo", ".auth-logo", ".page-logo", ".v-logo",
    ".tr-share-footer-brand", ".sc-brand-info .flist-title", "[aria-label*='ES TEAMS TV']"
  ];

  const LIGHTS = '<path class="esxmas-light-wire" d="M4 16 C 28 3, 51 29, 76 16 S 126 4, 153 16 S 190 29, 216 13"/><g class="esxmas-lights">' +
    '<circle cx="12" cy="14" r="3.2"/><circle cx="30" cy="13" r="3.2"/><circle cx="49" cy="18" r="3.2"/><circle cx="69" cy="19" r="3.2"/><circle cx="91" cy="13" r="3.2"/><circle cx="111" cy="10" r="3.2"/><circle cx="132" cy="13" r="3.2"/><circle cx="153" cy="18" r="3.2"/><circle cx="174" cy="20" r="3.2"/><circle cx="195" cy="17" r="3.2"/><circle cx="211" cy="12" r="3.2"/></g>';
  const BAUBLES = '<g class="esxmas-baubles"><path d="M23 30v-5"/><circle cx="23" cy="36" r="5"/><path d="M109 28v-5"/><circle cx="109" cy="35" r="5"/><path d="M191 28v-5"/><circle cx="191" cy="35" r="5"/></g>';

  function brandSvg() {
    return '<svg class="esxmas-brand-svg" viewBox="0 0 220 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + LIGHTS + BAUBLES + '</svg>';
  }

  function santaSvg() {
    return '<svg viewBox="0 0 128 132" aria-hidden="true" focusable="false"><path class="santa-hat" d="M33 37c8-21 31-31 57-20l18 8-22 13c-16-7-35-5-53 3z"/><circle class="santa-white" cx="105" cy="25" r="8"/><path class="santa-face" d="M29 52c2-18 16-29 37-29s35 11 37 29v29c-7 17-22 26-37 26S36 98 29 81z"/><path class="santa-trim" d="M29 55c18 8 54 8 74 0M35 87c12 13 39 17 57 0"/><circle class="santa-eye" cx="51" cy="59" r="3"/><circle class="santa-eye" cx="76" cy="59" r="3"/><path class="santa-beard" d="M38 70c8 11 19 17 29 17s21-6 29-17c-9 3-19 3-29 0-10 3-20 3-29 0z"/><circle class="santa-nose" cx="64" cy="69" r="4"/><path class="santa-smile" d="M56 78c5 4 11 4 16 0"/></svg>';
  }

  function reindeerSvg() {
    return '<svg viewBox="0 0 150 105" aria-hidden="true" focusable="false"><path d="M29 67c0-22 17-35 42-35 19 0 29 9 37 22l22 4c10 2 15 9 12 17-3 8-13 10-22 6l-15-8-17 18H51c-11 0-22-9-22-24z"/><path d="M105 49l10-21m-9 22 19-11M60 32l-8-18m9 18 9-20"/><circle class="deer-eye" cx="107" cy="52" r="3"/><circle class="deer-nose" cx="126" cy="59" r="5"/><path d="M52 90l-5 12m38-12 5 12"/></svg>';
  }

  function treeSvg() {
    return '<svg viewBox="0 0 150 205" aria-hidden="true" focusable="false"><path class="tree-star" d="M75 7l6 18 19 1-15 12 5 19-15-10-15 10 5-19-15-12 19-1z"/><path class="tree-tier tree-tier-a" d="M75 31L43 80h18L31 123h25l-35 51h108l-35-51h25L89 80h18z"/><path class="tree-trunk" d="M65 174h20v25H65z"/><path class="tree-garland" d="M48 92c20 13 41 13 57 0M37 132c26 14 49 14 76 0M27 166c31 14 64 14 96 0"/><g class="tree-baubles"><circle cx="59" cy="78" r="5"/><circle cx="88" cy="75" r="5"/><circle cx="48" cy="121" r="5"/><circle cx="77" cy="112" r="5"/><circle cx="101" cy="126" r="5"/><circle cx="38" cy="158" r="5"/><circle cx="69" cy="150" r="5"/><circle cx="111" cy="161" r="5"/></g><path class="tree-lights" d="M47 102c18 9 38 9 58 0M38 145c25 11 52 11 76 0"/></svg>';
  }

  function garlandSvg() {
    const bulbs = Array.from({ length: 21 }, (_, i) => {
      const x = 2 + i * 5;
      const y = 13 + Math.sin(i * 0.9) * 3;
      return '<circle cx="' + x + '" cy="' + y.toFixed(1) + '" r="1.35"/>';
    }).join("");
    const baubles = [12, 34, 56, 78, 98].map((x, i) => '<path d="M' + x + ' 22v-5"/><circle class="garland-bauble garland-bauble-' + (i % 3) + '" cx="' + x + '" cy="28" r="4.2"/>').join("");
    return '<svg viewBox="0 0 108 36" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 7c15 15 29-3 43 8s28 4 38 0 18 7 27-4"/><g class="garland-lights">' + bulbs + '</g><g class="garland-baubles">' + baubles + '</g></svg>';
  }

  function buildLayer() {
    const layer = document.createElement("div");
    layer.id = "esChristmasLayer";
    layer.className = "esxmas-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<div class="esxmas-garland">' + garlandSvg() + '</div>' +
      '<div class="esxmas-snow esxmas-snow-a"></div><div class="esxmas-snow esxmas-snow-b"></div>' +
      '<div class="esxmas-float esxmas-santa">' + santaSvg() + '</div>' +
      '<div class="esxmas-float esxmas-reindeer">' + reindeerSvg() + '</div>' +
      '<div class="esxmas-tree">' + treeSvg() + '</div>';
    document.body.appendChild(layer);
  }

  function decorateBrands() {
    const found = new Set();
    BRAND_SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach((el) => found.add(el)));
    document.querySelectorAll("a,div,span").forEach((el) => {
      if (el.children.length === 0 && /^ES TEAMS TV$/i.test(el.textContent.trim())) found.add(el);
    });
    found.forEach((el) => {
      if (el.dataset.esChristmasBrand) return;
      el.dataset.esChristmasBrand = "true";
      el.classList.add("esxmas-brand");
      const art = document.createElement("span");
      art.className = "esxmas-brand-art";
      art.innerHTML = brandSvg();
      el.appendChild(art);
    });
  }

  function playDailyGreeting() {
    if (window.location.pathname !== "/" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    const key = "esxmas-santa-greeting-date";
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch (_) {
      return;
    }
    window.setTimeout(() => {
      try {
        window.speechSynthesis.cancel();
        const greeting = new SpeechSynthesisUtterance("Ho ho ho!");
        greeting.lang = "en-US";
        greeting.pitch = 0.55;
        greeting.rate = 0.78;
        greeting.volume = 0.7;
        window.speechSynthesis.speak(greeting);
      } catch (_) {
        // Browser autoplay policy may reject speech; never interrupt the page.
      }
    }, 900);
  }

  function start() {
    if (!document.body) return;
    document.body.classList.add("esxmas-active");
    buildLayer();
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 180));
    schedule(decorateBrands, { timeout: 1200 });
    playDailyGreeting();
  }

  const style = document.createElement("style");
  style.textContent = `
    :root{--esxmas-red:#e84b5f;--esxmas-green:#35c98b;--esxmas-deep:#0c5b4e;--esxmas-gold:#ffd166;--esxmas-ice:#d9f5ff}
    .esxmas-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;isolation:isolate}
    .esxmas-snow{position:absolute;inset:-12vh -8vw;opacity:.34;will-change:transform;background-repeat:repeat;background-size:180px 180px;background-image:radial-gradient(circle at 12px 22px,rgba(255,255,255,.9) 0 1.7px,transparent 2.1px),radial-gradient(circle at 78px 86px,rgba(225,247,255,.72) 0 2.1px,transparent 2.7px),radial-gradient(circle at 142px 42px,rgba(255,255,255,.62) 0 1.2px,transparent 1.8px),radial-gradient(circle at 45px 150px,rgba(217,243,255,.68) 0 1.4px,transparent 2px);animation:esxmas-snowfall 24s linear infinite;mix-blend-mode:screen}
    .esxmas-snow-b{opacity:.16;background-size:280px 280px;filter:blur(.25px);animation-duration:36s;animation-direction:reverse}
    @keyframes esxmas-snowfall{from{transform:translate3d(-2vw,-10vh,0)}to{transform:translate3d(5vw,14vh,0)}}
    .esxmas-garland{position:absolute;z-index:0;top:calc(var(--nav-h,0px) + env(safe-area-inset-top,0px));left:0;width:100%;height:50px;opacity:.95;filter:drop-shadow(0 0 5px rgba(255,209,102,.35))}
    .esxmas-garland svg{width:100%;height:100%;display:block;overflow:visible;fill:none;stroke:rgba(255,255,255,.62);stroke-width:.55}
    .esxmas-garland .garland-lights{fill:var(--esxmas-gold);stroke:none;animation:esxmas-twinkle 2.8s ease-in-out infinite}
    .esxmas-garland .garland-lights circle:nth-child(3n){fill:var(--esxmas-red)}.esxmas-garland .garland-lights circle:nth-child(3n+1){fill:var(--esxmas-green)}
    .esxmas-garland .garland-baubles path{stroke:rgba(255,255,255,.7);stroke-width:.8}.esxmas-garland .garland-bauble{stroke:rgba(255,255,255,.8);stroke-width:.8;filter:drop-shadow(0 0 3px currentColor)}.esxmas-garland .garland-bauble-0{fill:var(--esxmas-red);color:var(--esxmas-red)}.esxmas-garland .garland-bauble-1{fill:var(--esxmas-gold);color:var(--esxmas-gold)}.esxmas-garland .garland-bauble-2{fill:var(--esxmas-green);color:var(--esxmas-green)}
    .esxmas-brand{position:relative;z-index:4;isolation:isolate;filter:drop-shadow(0 0 8px rgba(232,75,95,.3))}
    .esxmas-brand-art{position:absolute;z-index:0;inset:-15px -18px;pointer-events:none;overflow:visible;display:block}
    .esxmas-brand> :not(.esxmas-brand-art){position:relative;z-index:1}
    .esxmas-brand-svg{width:100%;height:100%;overflow:visible;display:block}
    .esxmas-light-wire{fill:none;stroke:rgba(255,255,255,.56);stroke-width:1.35;stroke-linecap:round}
    .esxmas-lights circle{fill:var(--esxmas-gold);filter:drop-shadow(0 0 4px var(--esxmas-gold));animation:esxmas-twinkle 2.4s ease-in-out infinite}
    .esxmas-lights circle:nth-child(3n){fill:var(--esxmas-red);filter:drop-shadow(0 0 4px var(--esxmas-red));animation-delay:-.8s}
    .esxmas-lights circle:nth-child(3n+1){fill:var(--esxmas-green);filter:drop-shadow(0 0 4px var(--esxmas-green));animation-delay:-1.5s}
    .esxmas-baubles path{stroke:rgba(255,255,255,.68);stroke-width:1.2}.esxmas-baubles circle{fill:var(--esxmas-red);stroke:rgba(255,255,255,.75);stroke-width:1.2;filter:drop-shadow(0 0 4px rgba(232,75,95,.85))}.esxmas-baubles circle:nth-of-type(2){fill:var(--esxmas-gold);filter:drop-shadow(0 0 4px rgba(255,209,102,.85))}.esxmas-baubles circle:nth-of-type(3){fill:var(--esxmas-green);filter:drop-shadow(0 0 4px rgba(53,201,139,.85))}
    @keyframes esxmas-twinkle{0%,100%{opacity:.68}50%{opacity:1}}
    .esxmas-float{position:absolute;animation:esxmas-drift 16s ease-in-out infinite;opacity:.92}
    .esxmas-float svg{width:100%;height:auto;display:block;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(255,209,102,.28))}
    .esxmas-santa{top:calc(var(--nav-h,0px) + 52px);right:5vw;width:116px;transform:rotate(6deg)}
    .esxmas-santa svg{stroke:var(--esxmas-red)}.esxmas-santa .santa-face{fill:#f2b58f;stroke:var(--esxmas-red)}.esxmas-santa .santa-hat{fill:var(--esxmas-red);stroke:var(--esxmas-red)}.esxmas-santa .santa-white,.esxmas-santa .santa-trim,.esxmas-santa .santa-beard{fill:#fff;stroke:#fff}.esxmas-santa .santa-eye{fill:#251b2d;stroke:#251b2d}.esxmas-santa .santa-nose{fill:#e84b5f;stroke:#e84b5f}.esxmas-santa .santa-smile{fill:none;stroke:#8c3a3a}
    .esxmas-reindeer{bottom:18vh;left:3vw;width:142px;animation-delay:-7s;transform:rotate(-4deg)}
    .esxmas-reindeer svg{stroke:#b9763a}.esxmas-reindeer .deer-eye{fill:#211a1a;stroke:#211a1a}.esxmas-reindeer .deer-nose{fill:var(--esxmas-red);stroke:var(--esxmas-red);filter:drop-shadow(0 0 5px var(--esxmas-red))}
    .esxmas-tree{position:absolute;right:4vw;bottom:-6px;width:156px;opacity:.96;filter:drop-shadow(0 0 16px rgba(53,201,139,.25))}
    .esxmas-tree svg{width:100%;display:block;overflow:visible;stroke-linecap:round;stroke-linejoin:round}
    .esxmas-tree .tree-tier{fill:var(--esxmas-deep);stroke:var(--esxmas-green);stroke-width:2}.esxmas-tree .tree-trunk{fill:#855332;stroke:#b97842;stroke-width:2}.esxmas-tree .tree-star{fill:var(--esxmas-gold);stroke:#fff2b0;stroke-width:1.5;filter:drop-shadow(0 0 7px var(--esxmas-gold))}.esxmas-tree .tree-garland{fill:none;stroke:var(--esxmas-gold);stroke-width:2}.esxmas-tree .tree-lights{fill:none;stroke:var(--esxmas-ice);stroke-width:3;stroke-dasharray:1 9;filter:drop-shadow(0 0 4px var(--esxmas-ice))}.esxmas-tree .tree-baubles circle{stroke:#fff;stroke-width:1.2;filter:drop-shadow(0 0 4px currentColor)}.esxmas-tree .tree-baubles circle:nth-child(3n){fill:var(--esxmas-red);color:var(--esxmas-red)}.esxmas-tree .tree-baubles circle:nth-child(3n+1){fill:var(--esxmas-gold);color:var(--esxmas-gold)}.esxmas-tree .tree-baubles circle:nth-child(3n+2){fill:var(--esxmas-green);color:var(--esxmas-green)}
    @keyframes esxmas-drift{0%,100%{translate:0 0}50%{translate:0 12px}}
    @media(max-width:700px){.esxmas-garland{height:38px}.esxmas-santa{top:calc(var(--nav-h,0px) + 38px);right:-10px;width:82px}.esxmas-reindeer{left:-24px;bottom:20vh;width:100px}.esxmas-tree{right:-17px;width:104px;bottom:0}.esxmas-brand-art{inset:-11px -12px}.esxmas-float{opacity:.72}.esxmas-snow{opacity:.25}.esxmas-snow-b{display:none}}
    @media(prefers-reduced-motion:reduce){.esxmas-snow,.esxmas-float,.esxmas-lights circle,.esxmas-garland g{animation:none}.esxmas-snow{transform:none}}
  `;
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
