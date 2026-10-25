/* Adsterra Native Banner.
   One banner per page, loaded exactly as Adsterra supplies it (their script and their container id, unmodified;
   nothing here styles or changes what the ad shows inside its container). Same audience and same eligibility check
   as the Social Bar and Popunder: logged-out visitors and signed-in members who are not verified, and only once the
   server has confirmed which of those they are. If the status is unknown or the check fails, nothing loads.
   Never on chess or Ludo pages, nor on login, verification, reset, account/security, payment, promote or admin pages.
   It sits in the normal flow of a short list of content pages, in a labelled "Sponsored" card, so it cannot cover
   navigation, buttons or content. The card stays hidden until the ad has actually filled it. */
(function () {
  "use strict";
  if (window.top !== window.self) return;           // never inside embeds or iframes
  if (window.__esNativeBanner) return;              // one banner per page, even if this file is included twice
  window.__esNativeBanner = true;

  var KEY = "9afd77ad2fc743e1f8f4d731a357d6fe";
  var AD_SRC = "https://bicea.org/21/" + KEY;
  var CONTAINER_ID = "container-" + KEY;
  var FILL_TIMEOUT_MS = 10000;

  var path = String(location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";

  var BLOCKED = [
    /^\/chess(\/|$)/, /^\/ludo(\/|$)/, /^\/whot(\/|$)/,
    /^\/login(\/|$)/, /^\/verify(\/|$)/, /^\/reset(\/|$)/,
    /^\/account(\/|$)/, /^\/pay\//, /^\/promote(\/|$)/, /^\/admin(\/|$)/
  ];
  for (var i = 0; i < BLOCKED.length; i++) if (BLOCKED[i].test(path)) return;

  var SLOTS = [
    { test: /^\/$/, anchors: [["#hmFeed", "afterend"], ["#hmTabs", "afterend"]] },                         // home: after the feed, centered in the main column
    { test: /^\/tools\/[^/]+$/, anchors: [[".tool-card", "afterend"]] },                                    // tool pages, not the /tools index
    { test: /^\/channel-react$/, anchors: [["#crHistoryCard", "afterend"], [".cr-wrap", "beforeend"]] },  // between the main flow and guidance
    { test: /^\/developers$/, anchors: [[".tile-list .tile:first-child", "afterend"], [".wrap", "beforeend"]] }
  ];

  function findSpot() {
    for (var s = 0; s < SLOTS.length; s++) {
      if (!SLOTS[s].test.test(path)) continue;
      for (var a = 0; a < SLOTS[s].anchors.length; a++) {
        var el = document.querySelector(SLOTS[s].anchors[a][0]);
        if (el && el.getClientRects().length > 0) return { el: el, where: SLOTS[s].anchors[a][1] };   // rendered, not display:none
      }
      return null;
    }
    return null;
  }

  function addStyle() {
    if (document.getElementById("es-native-style")) return;
    var st = document.createElement("style");
    st.id = "es-native-style";
    st.textContent = [
      ".es-native{position:relative;box-sizing:border-box;width:min(100%,640px);max-width:100%;clear:both;margin:28px auto;padding:12px 14px 14px;overflow:hidden;border-radius:14px;",
      "border:1px solid var(--border-strong,rgba(255,255,255,.13));",
      "background:linear-gradient(155deg,rgba(124,92,255,.12),rgba(0,224,255,.05) 55%,rgba(255,255,255,.03)),rgba(15,15,22,.5);",
      "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}",
      ".es-native::before{content:\"\";position:absolute;left:0;right:0;top:0;height:2px;opacity:.75;background:linear-gradient(90deg,var(--accent,#00E0FF),var(--accent2,#7c5cff))}",
      ":root[data-theme=\"light\"] .es-native{background:linear-gradient(155deg,rgba(124,92,255,.1),rgba(0,224,255,.05) 55%,rgba(255,255,255,.2)),rgba(255,255,255,.55)}",
      ".es-native-label{margin:0 0 8px;font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted,rgba(255,255,255,.42))}",
      ".es-native-slot{max-width:100%;overflow:hidden}",
      ".es-native[data-state=\"pending\"]{max-height:0;margin:0;padding:0;border-width:0;opacity:0}",
      "@media print{.es-native{display:none}}"
    ].join("");
    document.head.appendChild(st);
  }

  function place() {
    if (document.getElementById(CONTAINER_ID)) return;                                             // already on the page
    if (document.querySelector('script[data-es-native-banner], script[src*="' + KEY + '"]')) return; // script already added
    var spot = findSpot();
    if (!spot) return;
    addStyle();

    var card = document.createElement("div");
    card.className = "es-native";
    card.setAttribute("data-state", "pending");
    card.setAttribute("role", "complementary");
    card.setAttribute("aria-label", "Sponsored");
    var label = document.createElement("div");
    label.className = "es-native-label";
    label.textContent = "Sponsored";
    var slot = document.createElement("div");
    slot.className = "es-native-slot";
    var container = document.createElement("div");       // Adsterra's own container, left exactly as supplied
    container.id = CONTAINER_ID;
    slot.appendChild(container);
    card.appendChild(label);
    card.appendChild(slot);
    spot.el.insertAdjacentElement(spot.where, card);

    var done = false, timer = null, obs = null;
    function filled() { return !!container.firstElementChild || container.textContent.replace(/\s+/g, "") !== ""; }
    function finish(show) {
      if (done) return; done = true;
      if (timer) clearTimeout(timer);
      if (obs) obs.disconnect();
      if (show) card.removeAttribute("data-state"); else if (card.parentNode) card.parentNode.removeChild(card);   // no fill: no empty card
    }
    if (typeof MutationObserver === "function") {
      obs = new MutationObserver(function () { if (filled()) finish(true); });
      obs.observe(container, { childList: true, subtree: true, characterData: true });
    }
    timer = setTimeout(function () { finish(filled()); }, FILL_TIMEOUT_MS);

    var s = document.createElement("script");
    s.async = true;
    s.setAttribute("async", "async");
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-es-native-banner", "1");
    s.src = AD_SRC;
    s.onerror = function () { finish(false); };
    (document.body || document.documentElement).appendChild(s);
  }

  var eligibility = window.__esAdsEligibility || fetch("/api/ads/eligibility", { credentials: "same-origin", cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  eligibility.then(function (d) {
    if (d && (d.status === "guest" || d.status === "unverified")) place();
  });
})();
