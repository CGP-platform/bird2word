w · JS
// BIRD2WORD service worker — minimal, no-framework caching so the site can
// be installed as an app (Chrome/Android "Install app" / "Add to Home
// Screen", and iOS Safari's own Add-to-Home-Screen) and still open even with
// a flaky connection. Bump CACHE_NAME whenever these core files change so
// installed apps pick up the update instead of serving a stale copy forever.
const CACHE_NAME = "bird2word-v10";
 
const CORE_ASSETS = [
  "index.html",
  "about.html",
  "playground.html",
  "merch.html",
  "es.html",
  "manifest.json",
  "manifest-es.json",
  "logo/icon-192.png",
  "logo/icon-512.png",
  "logo/icon-1024.png"
];
 
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // don't block install if one asset is briefly unreachable
  );
  self.skipWaiting();
});
 
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
 
// Stale-while-revalidate: serve from cache instantly if we have it (so the
// installed app opens fast/offline), and always kick off a network fetch in
// the background to keep the cache fresh for next time.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept fonts/CDN, etc.
 
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
