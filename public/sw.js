const OFFLINE_CACHE = "es-teams-tv-offline-v1";
const OFFLINE_PAGE = "/offline.html";
const OFFLINE_LOGO = "/icon-32.png";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll([OFFLINE_PAGE, OFFLINE_LOGO]))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === OFFLINE_LOGO) {
    event.respondWith((async () => {
      const cached = await caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_LOGO));
      return cached || fetch(request);
    })());
    return;
  }

  if (request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_PAGE)) || Response.error();
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: "ES TEAMS TV", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "ES TEAMS TV";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "esteamstv-broadcast",
    renotify: !!data.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
