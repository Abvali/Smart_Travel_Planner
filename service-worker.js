// Set a name for the current cache
const cacheName = "tester1";

// Default files to always cache

const cacheFiles = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",

  "/js/app.js",

  "/modules/main.js",
  "/modules/lib.js",
  "/modules/install.js",
  "/modules/idb.js",

  "/css/style.css",

  "/data/db.js",

  "/leaflet/leaflet.js",
  "/leaflet/leaflet.css",

  "/assets/icons/museum.png",
  "/assets/icons/park.png",
  "/assets/icons/monument.png",
  "/assets/icons/marker.png",

  "/images/icons/icon-128x128.png",
  "/images/icons/icon-192x192.png",
  "/images/icons/icon-512x512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(cacheFiles);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// FETCH → Requests abfangen
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(cacheName).then((cache) => {
            cache.put(event.request, networkResponse.clone());

            return networkResponse;
          });
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    }),
  );
});

//
// self.addEventListener('fetch', function(e) {
// 	console.log('[ServiceWorker] Fetch', e.request.url);
//
// 	// e.respondWidth Responds to the fetch event
// 	e.respondWith(
//
// 		// Check in cache for the request being made
// 		caches.match(e.request)
//
//
// 			.then(function(response) {
//
// 				// If the request is in the cache
// 				if ( response ) {
// 					console.log("[ServiceWorker] Found in Cache", e.request.url, response);
// 					// Return the cached version
// 					return response;
// 				}
//
// 				// If the request is NOT in the cache, fetch and cache
//
// 				var requestClone = e.request.clone();
// 				return fetch(requestClone)
// 					.then(function(response) {
//
// 						if ( !response ) {
// 							console.log("[ServiceWorker] No response from fetch ")
// 							return response;
// 						}
//
// 						var responseClone = response.clone();
//
// 						//  Open the cache
// 						caches.open(cacheName).then(function(cache) {
//
// 							// Put the fetched response in the cache
// 							cache.put(e.request, responseClone);
// 							console.log('[ServiceWorker] New Data Cached', e.request.url);
//
// 							// Return the response
// 							return response;
//
// 				        }); // end caches.open
//
// 					})
// 					.catch(function(err) {
// 						console.log('[ServiceWorker] Error Fetching & Caching New Data', err);
// 					});
//
//
// 			}) // end caches.match(e.request)
// 	); // end e.respondWith
// });
