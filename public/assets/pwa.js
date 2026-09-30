/* PBD PWA — service worker + install prompt */
(function () {
  var DISMISS_KEY = "pbd-pwa-install-dismissed";
  var DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function wasDismissed() {
    try {
      var t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      return t && Date.now() - t < DISMISS_MS;
    } catch (e) {
      return false;
    }
  }

  function setDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function injectStyles() {
    if (document.getElementById("pbd-pwa-css")) return;
    var css = document.createElement("style");
    css.id = "pbd-pwa-css";
    css.textContent =
      "#pbd-install-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;" +
      "max-width:420px;margin:0 auto;background:#fff;border:1px solid #dce7ea;" +
      "border-radius:14px;box-shadow:0 10px 35px rgba(19,35,43,.12);padding:14px 16px;" +
      "display:flex;gap:12px;align-items:flex-start;font-family:Mukta,Inter,Arial,sans-serif}" +
      "#pbd-install-banner .pbd-ib-icon{width:40px;height:40px;border-radius:11px;background:#0b7285;" +
      "color:#fff;display:grid;place-items:center;font-weight:800;flex:none;font-size:1.1rem}" +
      "#pbd-install-banner .pbd-ib-body{flex:1;min-width:0}" +
      "#pbd-install-banner strong{display:block;font-size:.98rem;color:#13232b;margin:0 0 2px}" +
      "#pbd-install-banner p{margin:0;font-size:.85rem;color:#61727b;line-height:1.4}" +
      "#pbd-install-banner .pbd-ib-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
      "#pbd-install-banner button{font:inherit;font-weight:700;font-size:.88rem;border-radius:10px;" +
      "padding:8px 14px;cursor:pointer;border:1px solid #dce7ea;background:#fff;color:#13232b}" +
      "#pbd-install-banner button.pbd-ib-primary{background:#0b7285;border-color:#0b7285;color:#fff}" +
      "#pbd-install-banner button.pbd-ib-primary:hover{background:#075866}" +
      "#pbd-install-banner .pbd-ib-close{position:absolute;top:8px;right:10px;border:0;background:none;" +
      "color:#61727b;font-size:1.2rem;line-height:1;padding:4px 6px;cursor:pointer}" +
      "@media(min-width:480px){#pbd-install-banner{left:auto;right:16px;bottom:16px}}";
    document.head.appendChild(css);
  }

  function showBanner(opts) {
    if (document.getElementById("pbd-install-banner")) return;
    injectStyles();
    var el = document.createElement("div");
    el.id = "pbd-install-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Install PBD app");
    el.style.position = "relative";
    el.innerHTML =
      '<button type="button" class="pbd-ib-close" aria-label="Dismiss">×</button>' +
      '<div class="pbd-ib-icon" aria-hidden="true">P</div>' +
      '<div class="pbd-ib-body">' +
      "<strong>Install PBD</strong>" +
      "<p>" +
      (opts.message ||
        "Add to your home screen for faster access and offline tools.") +
      "</p>" +
      '<div class="pbd-ib-actions"></div>' +
      "</div>";
    var actions = el.querySelector(".pbd-ib-actions");
    if (opts.primaryLabel) {
      var primary = document.createElement("button");
      primary.type = "button";
      primary.className = "pbd-ib-primary";
      primary.textContent = opts.primaryLabel;
      primary.addEventListener("click", function () {
        if (opts.onPrimary) opts.onPrimary();
      });
      actions.appendChild(primary);
    }
    var later = document.createElement("button");
    later.type = "button";
    later.textContent = "Not now";
    later.addEventListener("click", function () {
      setDismissed();
      el.remove();
    });
    actions.appendChild(later);
    el.querySelector(".pbd-ib-close").addEventListener("click", function () {
      setDismissed();
      el.remove();
    });
    document.body.appendChild(el);
  }

  function setupInstallPrompt() {
    if (isStandalone() || wasDismissed()) return;

    var deferred = null;

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      showBanner({
        message: "Install the app for quick access and offline tools.",
        primaryLabel: "Install",
        onPrimary: function () {
          var banner = document.getElementById("pbd-install-banner");
          if (banner) banner.remove();
          deferred.prompt();
          deferred.userChoice.then(function (choice) {
            if (choice.outcome !== "accepted") setDismissed();
            deferred = null;
          });
        },
      });
    });

    window.addEventListener("appinstalled", function () {
      var banner = document.getElementById("pbd-install-banner");
      if (banner) banner.remove();
      setDismissed();
    });

    if (isIos() && !window.navigator.standalone) {
      setTimeout(function () {
        if (wasDismissed() || document.getElementById("pbd-install-banner"))
          return;
        showBanner({
          message:
            "On iPhone: tap Share, then “Add to Home Screen” for offline tools.",
          primaryLabel: null,
        });
      }, 2500);
    }
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(function (reg) {
        if (reg.update) {
          setInterval(function () {
            reg.update().catch(function () {});
          }, 60 * 60 * 1000);
        }
      })
      .catch(function (err) {
        console.warn("[pwa] SW registration failed", err);
      });
  }

  if (document.readyState === "complete") {
    registerSW();
    setupInstallPrompt();
  } else {
    window.addEventListener("load", function () {
      registerSW();
      setupInstallPrompt();
    });
  }
})();
