/* PBD PWA registration — shared by all pages */
(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(function (reg) {
        // Optional: check for updates periodically
        if (reg.update) {
          setInterval(function () {
            reg.update().catch(function () {});
          }, 60 * 60 * 1000);
        }
      })
      .catch(function (err) {
        console.warn("[pwa] SW registration failed", err);
      });
  });
})();
