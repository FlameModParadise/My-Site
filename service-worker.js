// Simple Service Worker
const CACHE_NAME = 'fmp-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only intercept specific types of requests, let images pass through normally
  const url = new URL(event.request.url);
  
  // Skip images and other media files - let them load normally
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    return; // Don't intercept, let browser handle normally
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return; // Don't intercept external requests
  }
  
  // Only intercept HTML, CSS, JS files
  if (url.pathname.match(/\.(html|css|js|json)$/i) || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If fetch fails, return a basic response
        return new Response('Network error', { status: 503 });
      })
    );
  }
});