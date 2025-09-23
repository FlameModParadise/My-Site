/* ========= My-Site Service Worker v3.0 ========= */

const PRECACHE        = "mysite-precache-v3";   // install‑time assets
const RUNTIME_IMG     = "mysite-img-v3";        // runtime images
const RUNTIME_JSON    = "mysite-json-v3";       // runtime data
const RUNTIME_PAGES   = "mysite-pages-v3";     // runtime pages

const urlsToCache = [
  // Core files
  "/", "/index.html", "/style.css", "/script.js", "/manifest.json",
  
  // Main pages
  "/pages/contact.html", "/pages/faq.html", "/pages/reviews.html",
  
  // Resource pages
  "/resources/about.html", "/resources/privacy.html", "/resources/sitemap.html", "/resources/tos.html",
  
  // Scripts
  "/scripts/contact.js", "/scripts/faq.js", "/scripts/reviews.js",
  
  // Styles
  "/styles/about.css", "/styles/contact.css", "/styles/faq.css", 
  "/styles/privacy.css", "/styles/reviews.css", "/styles/sitemap.css", "/styles/tos.css",
  
  // Core assets
  "/assets/logo.png", "/assets/placeholder.jpg", "/assets/loading.jpg",
  
  // Icons
  "/assets/icons/icon-192.png", "/assets/icons/icon-512.png", "/assets/icons/favicon.ico",
  "/assets/icons/contact.gif", "/assets/icons/fmp-icon.gif", "/assets/icons/turn-up.gif",
  
  // Essential checker images
  "/assets/checkers-pic/chatgpt.jpg", "/assets/checkers-pic/claudeai.png", 
  "/assets/checkers-pic/cursor.png", "/assets/checkers-pic/bolt.png",
  "/assets/checkers-pic/grok.png", "/assets/checkers-pic/perplexityai.jpg",
  "/assets/checkers-pic/genspark.png", "/assets/checkers-pic/blackboxai.png",
  "/assets/checkers-pic/klingai.png", "/assets/checkers-pic/hailuoai.png",
  "/assets/checkers-pic/ottplay.png", "/assets/checkers-pic/netflix.png",
  "/assets/checkers-pic/primevideo.jpg", "/assets/checkers-pic/spotify.jpg",
  "/assets/checkers-pic/music.png", "/assets/checkers-pic/crunchyroll.png",
  "/assets/checkers-pic/hotstar.png", "/assets/checkers-pic/peacocktv.jpg",
  "/assets/checkers-pic/mycanal+.jpg", "/assets/checkers-pic/outlook.png",
  "/assets/checkers-pic/azure.png", "/assets/checkers-pic/freepik.png",
  "/assets/checkers-pic/2captcha.png", "/assets/checkers-pic/codashop.jpg",
  "/assets/checkers-pic/surfshark.png", "/assets/checkers-pic/tradingview.jpg",
  "/assets/checkers-pic/smsvirtual.png", "/assets/checkers-pic/pingproxies.png",
  "/assets/checkers-pic/pyproxy.png", "/assets/checkers-pic/quillbot.png",
  
  // Essential checking images
  "/assets/checkers-pic/checking.png",
  
  // Bot images
  "/assets/bots/discord.jpg", "/assets/bots/telegram.png",
  
  // Footer icons
  "/assets/icons/footers-icons/payment.png", "/assets/icons/footers-icons/telegram.png",
  "/assets/icons/footers-icons/tgbot.png"
];

/* ---------- INSTALL (pre‑cache shell) ---------- */
self.addEventListener("install", (e) => {
  console.log("Service Worker: Installing...");
  e.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => {
        console.log("Service Worker: Caching essential files");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker: Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Installation failed", error);
      })
  );
});

/* ---------- ACTIVATE (clean old) ---------- */
self.addEventListener("activate", (e) => {
  console.log("Service Worker: Activating...");
  const keep = [PRECACHE, RUNTIME_IMG, RUNTIME_JSON, RUNTIME_PAGES];
  e.waitUntil(
    caches.keys()
      .then((keys) => {
        const deletePromises = keys
          .filter((key) => !keep.includes(key))
          .map((key) => {
            console.log("Service Worker: Deleting old cache", key);
            return caches.delete(key);
          });
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log("Service Worker: Activation complete");
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("Service Worker: Activation failed", error);
      })
  );
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  /* 1 IMAGES – Cache First Strategy */
  if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(RUNTIME_IMG).then(async (cache) => {
        try {
          const cached = await cache.match(req);
          if (cached) {
            console.log("Service Worker: Image served from cache", url.pathname);
            return cached;
          }
          
          const fresh = await fetch(req);
          if (fresh.ok) {
            cache.put(req, fresh.clone());
            console.log("Service Worker: Image cached", url.pathname);
          }
          return fresh;
        } catch (error) {
          console.error("Service Worker: Image fetch failed", url.pathname, error);
          return new Response("Image not available", { status: 404 });
        }
      })
    );
    return;
  }

  /* 2 JSON DATA – Network First Strategy */
  if (url.pathname.endsWith(".json")) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(RUNTIME_JSON).then((cache) => {
              cache.put(req, clone);
              console.log("Service Worker: JSON data cached", url.pathname);
            });
          }
          return resp;
        })
        .catch(() => {
          console.log("Service Worker: JSON served from cache", url.pathname);
          return caches.match(req);
        })
    );
    return;
  }

  /* 3 HTML PAGES – Cache First Strategy */
  if (url.pathname.endsWith(".html") || url.pathname === "/") {
    e.respondWith(
      caches.open(RUNTIME_PAGES).then(async (cache) => {
        try {
          const cached = await cache.match(req);
          if (cached) {
            console.log("Service Worker: Page served from cache", url.pathname);
            return cached;
          }
          
          const fresh = await fetch(req);
          if (fresh.ok) {
            cache.put(req, fresh.clone());
            console.log("Service Worker: Page cached", url.pathname);
          }
          return fresh;
        } catch (error) {
          console.error("Service Worker: Page fetch failed", url.pathname, error);
          return new Response("Page not available", { status: 404 });
        }
      })
    );
    return;
  }

  /* 4 CSS/JS FILES – Cache First Strategy */
  if (/\.(css|js)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(PRECACHE).then(async (cache) => {
        try {
          const cached = await cache.match(req);
          if (cached) {
            console.log("Service Worker: Asset served from cache", url.pathname);
            return cached;
          }
          
          const fresh = await fetch(req);
          if (fresh.ok) {
            cache.put(req, fresh.clone());
            console.log("Service Worker: Asset cached", url.pathname);
          }
          return fresh;
        } catch (error) {
          console.error("Service Worker: Asset fetch failed", url.pathname, error);
          return new Response("Asset not available", { status: 404 });
        }
      })
    );
    return;
  }

  /* 5 Everything else – Network First Strategy */
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          console.log("Service Worker: Resource fetched from network", url.pathname);
        }
        return resp;
      })
      .catch(() => {
        console.log("Service Worker: Resource served from cache", url.pathname);
        return caches.match(req);
      })
  );
});

/* ---------- MESSAGE HANDLING ---------- */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (e.data && e.data.type === "GET_CACHE_SIZE") {
    caches.keys().then((cacheNames) => {
      const cacheSizes = {};
      const promises = cacheNames.map((name) => {
        return caches.open(name).then((cache) => {
          return cache.keys().then((keys) => {
            cacheSizes[name] = keys.length;
          });
        });
      });
      
      Promise.all(promises).then(() => {
        e.ports[0].postMessage(cacheSizes);
      });
    });
  }
  
  if (e.data && e.data.type === "CLEAR_CACHE") {
    const cacheName = e.data.cacheName;
    if (cacheName) {
      caches.delete(cacheName).then(() => {
        e.ports[0].postMessage({ success: true, message: `Cache ${cacheName} cleared` });
      });
    } else {
      caches.keys().then((keys) => {
        const deletePromises = keys.map((key) => caches.delete(key));
        Promise.all(deletePromises).then(() => {
          e.ports[0].postMessage({ success: true, message: "All caches cleared" });
        });
      });
    }
  }
});

/* ---------- BACKGROUND SYNC ---------- */
self.addEventListener("sync", (e) => {
  if (e.tag === "background-sync") {
    e.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log("Service Worker: Background sync started");
    // Add any background sync logic here
    console.log("Service Worker: Background sync completed");
  } catch (error) {
    console.error("Service Worker: Background sync failed", error);
  }
}

/* ---------- PUSH NOTIFICATIONS ---------- */
self.addEventListener("push", (e) => {
  if (e.data) {
    const data = e.data.json();
    const options = {
      body: data.body,
      icon: "/assets/icons/icon-192.png",
      badge: "/assets/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1
      },
      actions: [
        {
          action: "explore",
          title: "View Details",
          icon: "/assets/icons/icon-192.png"
        },
        {
          action: "close",
          title: "Close",
          icon: "/assets/icons/icon-192.png"
        }
      ]
    };
    
    e.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

/* ---------- NOTIFICATION CLICK ---------- */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  
  if (e.action === "explore") {
    e.waitUntil(
      clients.openWindow("/")
    );
  } else if (e.action === "close") {
    // Just close the notification
  } else {
    // Default action - open the app
    e.waitUntil(
      clients.openWindow("/")
    );
  }
});

/* ---------- UTILITY FUNCTIONS ---------- */
function isImageRequest(url) {
  return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

function isJsonRequest(url) {
  return url.pathname.endsWith(".json");
}

function isHtmlRequest(url) {
  return url.pathname.endsWith(".html") || url.pathname === "/";
}

function isAssetRequest(url) {
  return /\.(css|js)$/i.test(url.pathname);
}

/* ---------- CACHE MANAGEMENT ---------- */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [PRECACHE, RUNTIME_IMG, RUNTIME_JSON, RUNTIME_PAGES];
  
  const deletePromises = cacheNames
    .filter((name) => !currentCaches.includes(name))
    .map((name) => caches.delete(name));
    
  await Promise.all(deletePromises);
  console.log("Service Worker: Old caches cleaned up");
}
