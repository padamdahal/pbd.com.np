// Load full Nepali stem dictionary (~36k) from JSON chunks
(function () {
  "use strict";
  window.NEPALI_WORDS = null;
  window.__NEPALI_DICT_READY = false;
  window.__NEPALI_DICT_ERROR = null;

  var CHUNKS = 16;
  var loaded = [];
  var done = 0;
  var failed = false;

  function finishOk() {
    var all = [];
    for (var i = 0; i < CHUNKS; i++) {
      if (loaded[i]) all = all.concat(loaded[i]);
    }
    window.NEPALI_WORDS = new Set(all);
    window.__NEPALI_DICT_READY = true;
    window.dispatchEvent(new Event("nepali-dict-ready"));
  }

  function finishErr(msg) {
    if (failed) return;
    failed = true;
    window.__NEPALI_DICT_ERROR = msg || "Failed to load dictionary";
    window.dispatchEvent(new Event("nepali-dict-error"));
  }

  for (var i = 0; i < CHUNKS; i++) {
    (function (idx) {
      fetch("dict-" + idx + ".json", { credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status + " for dict-" + idx + ".json");
          return r.json();
        })
        .then(function (arr) {
          loaded[idx] = arr;
          done++;
          if (done === CHUNKS) finishOk();
        })
        .catch(function (e) {
          finishErr(e && e.message ? e.message : String(e));
        });
    })(i);
  }
})();
