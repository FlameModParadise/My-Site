/*  service-worker.js  */
/* -------------------------------------------------------- */
/*  Network‑first, cache‑fallback strategy                 */
/*  – grabs newest files whenever the user is online       */
/*  – keeps a cache for offline visits                     */
/*  – activates immediately (skipWaiting + claim)          */
/* -------------------------------------------------------- */

const CACHE_NAME = 'toolstore-static';   // you never have to touch this
const PRECACHE   = [
  '/',                        // entry page
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',

  /* data */
  '/data/tools.json',
  '/data/bots.json',
  '/data/checkers.json',
  '/data/steam.json',
  '/data/offers.json',
  '/data/others.json',

  /* icons / images */
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/placeholder.jpg'
];

/* ---------- INSTALL (pre‑cache the core files) ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();           // activate this SW immediately
});

/* ---------- ACTIVATE (take control right away) ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

/* ---------- FETCH (network‑first) ---------- */
self.addEventListener('fetch', event => {
  /* Only handle same‑origin GET requests */
  if (event.request.method !== 'GET' ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    /* Try the network first */
    fetch(event.request)
      .then(networkResp => {
        /* If we got a good response, update the cache for next time */
        if (networkResp.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResp.clone());
          });
        }
        return networkResp;            // show the fresh file
      })
      .catch(() => caches.match(event.request))   // offline → use cache
  );
});
