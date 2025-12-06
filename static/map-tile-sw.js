// Minimal service worker used for map tile caching requests.
// This file exists to satisfy requests to `/map-tile-sw.js` and can be extended later.

self.addEventListener("install", (_event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Basic fetch handler: allow normal network behavior; can be extended for caching.
self.addEventListener("fetch", (_event) => {
  // Optionally, we could intercept requests to tile providers and cache them.
  // For now return network response (let the browser handle it).
})
