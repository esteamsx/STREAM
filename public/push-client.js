(function () {
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  async function getStatus() {
    if (!(await isSupported())) return "unsupported";
    return Notification.permission;
  }

  async function enable() {
    if (!(await isSupported())) throw new Error("Push notifications are not supported on this browser.");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const keyRes = await fetch("/api/push/vapid-public-key");
    const keyData = await keyRes.json();
    if (!keyData.publicKey) throw new Error("Push is not configured on this server yet.");

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON(), ua: navigator.userAgent }),
    });
    if (!res.ok) throw new Error("Could not save subscription.");
    return true;
  }

  async function disable() {
    if (!(await isSupported())) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  }

  async function hasActiveSubscription() {
    if (!(await isSupported())) return false;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return false;
    const subscription = await reg.pushManager.getSubscription();
    return !!subscription;
  }

  window.ESPush = { isSupported, getStatus, hasActiveSubscription, enable, disable };
})();
