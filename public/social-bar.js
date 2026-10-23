/* Adsterra Social Bar.
   Loads only for logged-out visitors and signed-in members who are not verified, and only after the
   server has confirmed which of those they are. If the status is unknown or the check fails, no ad loads. */
(function () {
  "use strict";
  if (window.top !== window.self) return;          // never inside embeds or iframes
  if (window.__esSocialBar) return;                 // one check per page, even if this file is included twice
  window.__esSocialBar = true;

  var AD_SRC = "https://bicea.org/14/5366b54c169a1046764b85fbc69d0901";

  function loadAd() {
    if (document.querySelector("script[data-es-social-bar]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-es-social-bar", "1");
    s.src = AD_SRC;
    (document.body || document.documentElement).appendChild(s);
  }

  function check(retry) {
    return fetch("/api/ads/eligibility", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (d && d.status !== "unknown") return d;
        if (!retry) return d;
        return new Promise(function (resolve) { setTimeout(resolve, 3000); }).then(function () { return check(false); });
      });
  }
  window.__esAdsEligibility = window.__esAdsEligibility || check(true);

  window.__esAdsEligibility.then(function (d) {
    if (d && (d.status === "guest" || d.status === "unverified")) loadAd();
  });
})();
