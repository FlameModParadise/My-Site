const CACHE_NAME = "toolstore-v3";

const ASSETS_TO_CACHE = [
  "/", 
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",

  // Data files
  "/data/tools.json",
  "/data/bots.json",
  "/data/checkers.json",
  "/data/steam.json",
  "/data/offers.json",
  "/data/others.json",

  // Icons
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",

  // Placeholder image
  "/assets/placeholder.jpg"
];

// 📦 Install - Cache essential assets
self.addEventListener("install", event => {
  console.log("[ServiceWorker] Installed");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// ♻️ Activate - Clean up old caches
self.addEventListener("activate", event => {
  console.log("[ServiceWorker] Activated");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

// 🌐 Fetch - Serve from cache, fall back to network, and cache new resources
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            // ⚠️ Clone the response before caching because it's a stream
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        })
      );
    }).catch(() => {
      // Optional fallback: return offline page or icon
    })
  );
});
