/**
 * ads.js — Deferred, offline-safe, zero-CLS manual AdSense loader for PBD.
 *
 * - Never triggers Auto Ads or eager <head> network fetches.
 * - Keeps containers collapsed if offline, unconfigured (no numeric slot ID),
 *   or if AdSense returns data-ad-status="unfilled" / is blocked.
 */
(function () {
  "use strict";

  var slots = document.querySelectorAll("aside.ad-slot");
  if (!slots.length) return;

  function collapseSlot(slotEl) {
    if (!slotEl) return;
    slotEl.setAttribute("data-ad-state", "collapsed");
    slotEl.hidden = true;
  }

  function revealSlot(slotEl) {
    if (!slotEl) return;
    slotEl.hidden = false;
    slotEl.setAttribute("data-ad-state", "ready");
  }

  var activeSlots = [];
  for (var i = 0; i < slots.length; i++) {
    var aside = slots[i];
    var ins = aside.querySelector("ins.adsbygoogle");
    var client = ins ? (ins.getAttribute("data-ad-client") || "").trim() : "";
    var slotId = ins ? (ins.getAttribute("data-ad-slot") || "").trim() : "";

    if (!navigator.onLine || !/^ca-pub-\d+$/.test(client) || !/^\d+$/.test(slotId)) {
      collapseSlot(aside);
      continue;
    }

    revealSlot(aside);
    activeSlots.push({ aside: aside, ins: ins, client: client });
  }

  if (!activeSlots.length) return;

  var scriptPromise = null;
  function loadAdSenseScript(client) {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle) && window.adsbygoogle.loaded) {
        resolve();
        return;
      }
      var existing = document.querySelector('script[data-pbd-adsense="1"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      var s = document.createElement("script");
      s.async = true;
      s.crossOrigin = "anonymous";
      s.dataset.pbdAdsense = "1";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      s.addEventListener("load", function () {
        resolve();
      }, { once: true });
      s.addEventListener("error", function () {
        reject(new Error("AdSense script blocked or failed to load"));
      }, { once: true });
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  function observeAdStatus(aside, ins) {
    if (!("MutationObserver" in window)) return;
    var check = function () {
      var st = ins.getAttribute("data-ad-status");
      if (st === "unfilled") {
        collapseSlot(aside);
      } else if (st === "filled") {
        aside.setAttribute("data-ad-state", "filled");
      }
    };
    var mo = new MutationObserver(check);
    mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    check();
  }

  function initSlot(entry) {
    if (entry.initialized) return;
    entry.initialized = true;
    observeAdStatus(entry.aside, entry.ins);

    loadAdSenseScript(entry.client)
      .then(function () {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (_err) {
          collapseSlot(entry.aside);
        }
      })
      .catch(function () {
        collapseSlot(entry.aside);
      });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        for (var j = 0; j < entries.length; j++) {
          if (!entries[j].isIntersecting) continue;
          var target = entries[j].target;
          io.unobserve(target);
          for (var k = 0; k < activeSlots.length; k++) {
            if (activeSlots[k].aside === target) {
              initSlot(activeSlots[k]);
              break;
            }
          }
        }
      },
      { rootMargin: "320px 0px" }
    );

    for (var m = 0; m < activeSlots.length; m++) {
      io.observe(activeSlots[m].aside);
    }
  } else {
    var boot = function () {
      for (var n = 0; n < activeSlots.length; n++) initSlot(activeSlots[n]);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(boot, { timeout: 2500 });
    } else {
      window.setTimeout(boot, 1200);
    }
  }

  window.addEventListener("offline", function () {
    for (var x = 0; x < activeSlots.length; x++) {
      if (activeSlots[x].aside.getAttribute("data-ad-state") !== "filled") {
        collapseSlot(activeSlots[x].aside);
      }
    }
  });
})();
