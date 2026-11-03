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

  const LIGHTS = '<path class="esxmas-light-wire" d="M5 15 C 34 2, 61 27, 91 14 S 151 3, 215 16"/><g class="esxmas-lights">' +
    '<circle cx="16" cy="13" r="2.5"/><circle cx="37" cy="14" r="2.5"/><circle cx="60" cy="17" r="2.5"/><circle cx="83" cy="17" r="2.5"/><circle cx="106" cy="12" r="2.5"/><circle cx="130" cy="10" r="2.5"/><circle cx="153" cy="12" r="2.5"/><circle cx="177" cy="15" r="2.5"/><circle cx="201" cy="15" r="2.5"/></g>';
  const BAUBLES = '<g class="esxmas-baubles"><path d="M27 32v-3"/><circle cx="27" cy="36" r="4"/><path d="M112 35v-3"/><circle cx="112" cy="39" r="4"/><path d="M190 30v-3"/><circle cx="190" cy="34" r="4"/></g>';

  function brandSvg() {
    return '<svg class="esxmas-brand-svg" viewBox="0 0 220 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + LIGHTS + BAUBLES + '</svg>';
  }

  function santaSvg() {
    return '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><path d="M26 45c1-17 12-28 29-28s28 11 29 28"/><path d="M24 45h62l-5 28H29z"/><path d="M30 30c8-8 25-12 39-4"/><path d="M35 57c5 7 20 9 28 0"/><circle cx="44" cy="45" r="2.5" fill="currentColor"/><circle cx="61" cy="45" r="2.5" fill="currentColor"/><path d="M47 52c4 3 8 3 12 0"/><path d="M28 22c9-10 24-11 36-4l-8 10c-8-4-17-3-25 1z" fill="currentColor"/><circle cx="64" cy="19" r="5" fill="currentColor"/><path d="M31 71c9 7 26 9 37 0"/></svg>';
  }

  function reindeerSvg() {
    return '<svg viewBox="0 0 120 86" aria-hidden="true" focusable="false"><path d="M25 55c0-18 14-29 33-29 15 0 22 7 28 17l18 3c8 1 12 7 10 13-2 6-10 8-17 5l-12-6-13 15H43c-8 0-18-7-18-18z"/><path d="M86 42l8-13m-8 14 15-8M50 26l-6-14m7 14 7-15"/><circle cx="88" cy="44" r="2" fill="currentColor"/><circle cx="103" cy="51" r="3.5" fill="#e84b5f"/><path d="M42 71l-4 11m30-11 4 11"/></svg>';
  }

  function buildLayer() {
    const layer = document.createElement("div");
    layer.id = "esChristmasLayer";
    layer.className = "esxmas-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<div class="esxmas-snow esxmas-snow-a"></div><div class="esxmas-snow esxmas-snow-b"></div>' +
      '<div class="esxmas-float esxmas-santa">' + santaSvg() + '</div>' +
      '<div class="esxmas-float esxmas-reindeer">' + reindeerSvg() + '</div>';
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

  function addSoundToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "esChristmasSoundToggle";
    button.className = "esxmas-sound-toggle";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Play Santa greeting");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10v4h4l5 4V6l-5 4H4z"/><path d="M17 9c2 2 2 4 0 6"/><path d="M19.5 6.5c4 3.2 4 7.8 0 11"/></svg><span>Santa greeting</span>';
    let muted = true;
    const update = () => {
      button.setAttribute("aria-pressed", String(!muted));
      button.setAttribute("aria-label", muted ? "Play Santa greeting" : "Mute Santa greeting");
      button.classList.toggle("is-playing", !muted);
    };
    button.addEventListener("click", () => {
      muted = !muted;
      if (!muted && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
        window.speechSynthesis.cancel();
        const greeting = new SpeechSynthesisUtterance("Ho ho ho!");
        greeting.lang = "en-US";
        greeting.pitch = 0.55;
        greeting.rate = 0.78;
        greeting.volume = 0.7;
        greeting.onend = () => { muted = true; update(); };
        window.speechSynthesis.speak(greeting);
      } else if (muted && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      update();
    });
    document.body.appendChild(button);
    update();
  }

  function start() {
    if (!document.body) return;
    document.body.classList.add("esxmas-active");
    buildLayer();
    decorateBrands();
    addSoundToggle();
  }

  const style = document.createElement("style");
  style.textContent = `
    :root{--esxmas-red:#e84b5f;--esxmas-green:#35c98b;--esxmas-gold:#ffd166;--esxmas-ice:#bfeeff}
    .esxmas-layer{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;isolation:isolate}
    .esxmas-snow{position:absolute;inset:-12vh -8vw;opacity:.45;will-change:transform;background-repeat:repeat;background-size:180px 180px;background-image:radial-gradient(circle at 12px 22px,rgba(255,255,255,.88) 0 1.4px,transparent 1.8px),radial-gradient(circle at 78px 86px,rgba(225,247,255,.75) 0 1.8px,transparent 2.2px),radial-gradient(circle at 142px 42px,rgba(255,255,255,.58) 0 1px,transparent 1.5px),radial-gradient(circle at 45px 150px,rgba(217,243,255,.7) 0 1.2px,transparent 1.8px);animation:esxmas-snowfall 20s linear infinite}
    .esxmas-snow-b{opacity:.24;background-size:280px 280px;filter:blur(.35px);animation-duration:32s;animation-direction:reverse}
    @keyframes esxmas-snowfall{from{transform:translate3d(-2vw,-10vh,0)}to{transform:translate3d(5vw,14vh,0)}}
    .esxmas-brand{position:relative;isolation:isolate;filter:drop-shadow(0 0 7px rgba(232,75,95,.24))}
    .esxmas-brand-art{position:absolute;z-index:0;inset:-11px -14px;pointer-events:none;overflow:visible;display:block}
    .esxmas-brand> :not(.esxmas-brand-art){position:relative;z-index:1}
    .esxmas-brand-svg{width:100%;height:100%;overflow:visible;display:block}
    .esxmas-light-wire{fill:none;stroke:rgba(255,255,255,.38);stroke-width:1.15;stroke-linecap:round}
    .esxmas-lights circle{fill:var(--esxmas-gold);filter:drop-shadow(0 0 3px var(--esxmas-gold));animation:esxmas-twinkle 2.4s ease-in-out infinite}
    .esxmas-lights circle:nth-child(3n){fill:var(--esxmas-red);filter:drop-shadow(0 0 3px var(--esxmas-red));animation-delay:-.8s}
    .esxmas-lights circle:nth-child(3n+1){fill:var(--esxmas-green);filter:drop-shadow(0 0 3px var(--esxmas-green));animation-delay:-1.5s}
    .esxmas-baubles path{stroke:rgba(255,255,255,.5);stroke-width:1}
    .esxmas-baubles circle{fill:var(--esxmas-red);stroke:rgba(255,255,255,.65);stroke-width:1;filter:drop-shadow(0 0 3px rgba(232,75,95,.75))}
    .esxmas-baubles circle:nth-of-type(2){fill:var(--esxmas-gold);filter:drop-shadow(0 0 3px rgba(255,209,102,.75))}
    .esxmas-baubles circle:nth-of-type(3){fill:var(--esxmas-green);filter:drop-shadow(0 0 3px rgba(53,201,139,.75))}
    @keyframes esxmas-twinkle{0%,100%{opacity:.65}50%{opacity:1}}
    .esxmas-float{position:absolute;color:rgba(191,238,255,.28);filter:drop-shadow(0 0 12px rgba(191,238,255,.2));animation:esxmas-drift 16s ease-in-out infinite;opacity:.7}
    .esxmas-float svg{width:100%;height:auto;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .esxmas-santa{top:16vh;right:5vw;width:74px;transform:rotate(7deg)}
    .esxmas-santa svg{stroke:var(--esxmas-red)}
    .esxmas-santa svg circle{fill:currentColor}
    .esxmas-reindeer{bottom:18vh;left:4vw;width:96px;animation-delay:-7s;transform:rotate(-4deg)}
    .esxmas-reindeer svg{stroke:var(--esxmas-gold)}
    .esxmas-reindeer svg circle:first-of-type{fill:currentColor}.esxmas-reindeer svg circle:last-of-type{fill:var(--esxmas-red)}
    @keyframes esxmas-drift{0%,100%{translate:0 0}50%{translate:0 12px}}
    .esxmas-sound-toggle{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:3;pointer-events:auto;display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(255,209,102,.36);border-radius:999px;background:rgba(18,18,28,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--esxmas-gold);font:600 .68rem var(--font-body);box-shadow:0 6px 20px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.13)}
    .esxmas-sound-toggle:hover{border-color:var(--esxmas-gold);background:rgba(255,209,102,.12)}
    .esxmas-sound-toggle:focus-visible{outline:2px solid var(--esxmas-gold);outline-offset:2px}
    .esxmas-sound-toggle svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .esxmas-sound-toggle.is-playing{color:var(--esxmas-green);border-color:rgba(53,201,139,.45)}
    :root[data-theme="light"] .esxmas-sound-toggle{background:rgba(255,255,255,.78);color:#9a6700}
    @media(max-width:900px){.esxmas-sound-toggle{bottom:calc(68px + env(safe-area-inset-bottom,0px))}}
    @media(max-width:560px){.esxmas-float{opacity:.42}.esxmas-santa{top:13vh;right:1vw;width:58px}.esxmas-reindeer{left:-12px;bottom:24vh;width:76px}.esxmas-sound-toggle{right:9px;padding:6px 8px}.esxmas-sound-toggle span{display:none}.esxmas-brand-art{inset:-9px -10px}}
    @media(prefers-reduced-motion:reduce){.esxmas-snow,.esxmas-float,.esxmas-lights circle{animation:none}.esxmas-snow{transform:none}}
  `;
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
