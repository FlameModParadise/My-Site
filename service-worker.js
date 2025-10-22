// Optimized Service Worker for Mobile Performance
const CACHE_NAME = 'fmp-v2';
const STATIC_CACHE = 'fmp-static-v2';
const IMAGE_CACHE = 'fmp-images-v2';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle images with optimized caching
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Return cached image immediately
            return response;
          }
          
          // Fetch and cache the image
          return fetch(event.request).then(fetchResponse => {
            // Only cache successful responses
            if (fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Return a placeholder image if fetch fails
            return new Response(
              '<svg width="280" height="140" viewBox="0 0 280 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="280" height="140" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#999" text-anchor="middle" dy=".3em">Image not available</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          });
        });
      })
    );
    return;
  }
  
  // Handle static files
  if (url.pathname.match(/\.(html|css|js|json)$/i) || url.pathname === '/') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Return basic offline response
            return new Response('Offline - Please check your connection', { 
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        });
      })
    );
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
});