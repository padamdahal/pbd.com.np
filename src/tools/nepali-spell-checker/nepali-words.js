/**
 * Load Nepali stems from official Hunspell dictionary (client-side).
 * Source: dictionary-ne (Madan Puraskar Pustakalaya, LGPL-2.1) via jsDelivr.
 * https://cdn.jsdelivr.net/npm/dictionary-ne@2.0.0/index.dic
 */
(function () {
  "use strict";

  window.NEPALI_WORDS = null;
  window.__NEPALI_DICT_READY = false;
  window.__NEPALI_DICT_ERROR = null;

  // Pinned CDN URL (CORS-enabled)
  var DIC_URL = "https://cdn.jsdelivr.net/npm/dictionary-ne@2.0.0/index.dic";
  // Fallback mirror
  var DIC_FALLBACK =
    "https://cdn.jsdelivr.net/gh/wooorm/dictionaries@main/dictionaries/ne/index.dic";

  var DEVANAGARI = /[\u0900-\u097F]/;

  function parseDic(text) {
    var set = new Set();
    var lines = text.split(/\r?\n/);
    var start = 0;
    // First line is often the entry count
    if (lines.length && /^\d+$/.test(lines[0].trim())) start = 1;
    for (var i = start; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === "#") continue;
      // Hunspell: word[/flags]
      var slash = line.indexOf("/");
      var word = (slash === -1 ? line : line.slice(0, slash)).trim();
      // Strip BOM / odd prefixes
      if (word.charCodeAt(0) === 0xfeff) word = word.slice(1);
      if (!word) continue;
      // Keep Devanagari stems (and pure Nepali digits if present)
      if (DEVANAGARI.test(word) || /^[०-९]+$/.test(word)) {
        set.add(word);
      }
    }
    return set;
  }

  function finishOk(set) {
    window.NEPALI_WORDS = set;
    window.__NEPALI_DICT_READY = true;
    window.__NEPALI_DICT_ERROR = null;
    window.dispatchEvent(new Event("nepali-dict-ready"));
  }

  function finishErr(msg) {
    window.__NEPALI_DICT_ERROR = msg || "Failed to load dictionary";
    window.__NEPALI_DICT_READY = false;
    window.dispatchEvent(new Event("nepali-dict-error"));
  }

  function loadFrom(url) {
    return fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" }).then(
      function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " loading dictionary");
        return r.text();
      }
    );
  }

  loadFrom(DIC_URL)
    .catch(function () {
      return loadFrom(DIC_FALLBACK);
    })
    .then(function (text) {
      var set = parseDic(text);
      if (!set.size) throw new Error("Dictionary parsed empty");
      finishOk(set);
    })
    .catch(function (e) {
      finishErr(e && e.message ? e.message : String(e));
    });
})();
