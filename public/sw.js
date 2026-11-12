/* PBD service worker — full offline shell + persistent Nepali Dictionary data cache */
var CACHE_VERSION = "pbd-v7";
var DICT_CACHE = "pbd-dict-data-v1";
var KEEP_CACHES = [CACHE_VERSION, DICT_CACHE];

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
  "/tools/land-unit-converter/land-converter.js",
  "/tools/nepali-dictionary/",
  "/tools/nepali-dictionary/index.html",
  "/tools/nepali-dictionary/dictionary.js",
  "/tools/nepali-dictionary/index.json",
  "/tools/nepali-dictionary/manifest.webmanifest",
  "/tools/nepali-dictionary/icons/icon.svg",
  "/tools/nepali-dictionary/icons/icon-192.png",
  "/tools/nepali-dictionary/icons/icon-512.png",
  "/tools/nepali-dictionary/icons/icon-maskable-192.png",
  "/tools/nepali-dictionary/icons/icon-maskable-512.png",
  "/tools/nepali-dictionary/icons/apple-touch-icon.png"
];

function isDictDataUrl(url) {
  return (
    url.origin === self.location.origin &&
    /^\/tools\/nepali-dictionary\/(?:index\.json|dict-\d+\.json)$/.test(url.pathname)
  );
}

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
              return KEEP_CACHES.indexOf(k) === -1;
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
  var url = new URL(event.request.url);

  // Dictionary chunks + index: cache-first in persistent DICT_CACHE
  if (isDictDataUrl(url)) {
    event.respondWith(
      caches.open(DICT_CACHE).then(function (cache) {
        return cache.match(url.pathname).then(function (cached) {
          if (cached) return cached;
          return fetch(event.request).then(function (response) {
            if (response && response.status === 200) {
              cache.put(url.pathname, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Navigation requests (preserve offline support even with ?q=... params)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request)
          .then(function (response) {
            if (response && response.status === 200 && response.type === "basic") {
              var clone = response.clone();
              caches.open(CACHE_VERSION).then(function (cache) {
                cache.put(url.pathname, clone);
              });
            }
            return response;
          })
          .catch(function () {
            if (url.pathname.indexOf("/tools/nepali-dictionary") === 0) {
              return caches.match("/tools/nepali-dictionary/");
            }
            return caches.match("/offline.html");
          });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request)
        .then(function (response) {
          if (
            !response ||
            (response.status !== 200 && response.type !== "opaque") ||
            (response.type !== "basic" &&
              url.origin !== "https://fonts.googleapis.com" &&
              url.origin !== "https://fonts.gstatic.com")
          ) {
            return response;
          }
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function () {
          return undefined;
        });
    })
  );
});
