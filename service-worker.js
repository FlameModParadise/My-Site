const CACHE_NAME = "toolstore-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",

  // Dynamic data files (add more as needed)
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch - Serve assets from the cache or network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
