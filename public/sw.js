/* PBD service worker — full offline shell + tools */
var CACHE_VERSION = "pbd-v3";
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
  "/tools/today-nepali-date/index.html"
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

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept") &&
      request.headers.get("accept").indexOf("text/html") !== -1)
  );
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(url) {
  var p = url.pathname;
  return (
    p.indexOf("/assets/") === 0 ||
    p.indexOf("/tools/") === 0 ||
    /\.(js|css|png|svg|webmanifest|json|ico|woff2?)$/i.test(p)
  );
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (!isSameOrigin(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return (
              cached ||
              caches.match(url.pathname) ||
              caches.match("/offline.html")
            );
          });
        })
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        var networkFetch = fetch(request)
          .then(function (response) {
            if (response && response.ok) {
              var copy = response.clone();
              caches.open(CACHE_VERSION).then(function (cache) {
                cache.put(request, copy);
              });
            }
            return response;
          })
          .catch(function () {
            return cached;
          });
        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request);
      })
  );
});
