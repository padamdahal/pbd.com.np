/* PBD service worker — full offline shell + tools */
var CACHE_VERSION = "pbd-v6";
var PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/assets/style.css",
  "/assets/menu.js",
  "/assets/pwa.js",
  "/assets/icons/icon.svg",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/apple-touch-icon.png",
  "/assets/og-default.svg",
  "/menu.json",
  "/about/",
  "/privacy/",
  "/tools/nepali-date-converter/",
  "/tools/nepali-date-converter/nepali-date-converter.js",
  "/tools/bs-age-calculator/",
  "/tools/bs-age-calculator/age-calculator.js",
  "/tools/nepali-typing/",
  "/tools/nepali-typing/nepali-typing.js",
  "/tools/local-weather/",
  "/tools/local-weather/local-weather.js",
  "/tools/today-nepali-date/",
  "/tools/today-nepali-date/index.html",
  "/tools/land-unit-converter/",
  "/tools/land-unit-converter/land-converter.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache.addAll(PRECACHE).catch(function () {
          return Promise.all(
            PRECACHE.map(function (url) {
              return cache.add(url).catch(function () {});
            })
          );
        });
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE_VERSION;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
      });
    })
  );
});
