/* Adsterra Popunder.
   One popunder per page, loaded exactly as Adsterra supplies it (their script, unmodified, no wrapper CSS).
   Same audience as the Social Bar: logged-out visitors and signed-in members who are not verified, and only
   after the server has confirmed which of those they are. If the status is unknown or the check fails, no ad loads.
   Never loaded on chess or Ludo pages (a popunder script cannot be switched off or told a match started once it is
   on the page), nor on login, verification, password reset, account/security, payment, promote or admin pages. */
(function () {
  "use strict";
  if (window.top !== window.self) return;           // never inside embeds or iframes
  if (window.__esPopunder) return;                  // one popunder per page, even if this file is included twice
  window.__esPopunder = true;

  var AD_SRC = "https://afders.org/1/0fb9b1347c7022280dbd97f2b0e5032f";

  var BLOCKED = [
    /^\/chess(\/|$)/, /^\/ludo(\/|$)/, /^\/whot(\/|$)/, /^\/snakes(\/|$)/,
    /^\/login(\/|$)/, /^\/verify(\/|$)/, /^\/reset(\/|$)/,
    /^\/account(\/|$)/, /^\/pay\//, /^\/promote(\/|$)/, /^\/admin(\/|$)/
  ];
  var path = String(location.pathname || "/").toLowerCase();
  for (var i = 0; i < BLOCKED.length; i++) if (BLOCKED[i].test(path)) return;

  function loadAd() {
    if (document.querySelector("script[data-es-popunder]")) return;
    if (document.querySelector('script[src*="afders.org"]')) return;   // already on the page some other way
    var s = document.createElement("script");
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-es-popunder", "1");
    s.src = AD_SRC;
    (document.body || document.documentElement).appendChild(s);
  }

  var eligibility = window.__esAdsEligibility || fetch("/api/ads/eligibility", { credentials: "same-origin", cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  eligibility.then(function (d) {
    if (d && (d.status === "guest" || d.status === "unverified")) loadAd();
  });
})();
