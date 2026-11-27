(function () {
  if (!("serviceWorker" in navigator)) return;
  function registerOfflineWorker() {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
  if (document.readyState === "complete") registerOfflineWorker();
  else window.addEventListener("load", registerOfflineWorker, { once: true });
})();
