// Nepali stems ~36k from MPP Hunspell (LGPL-2.1) via wooorm/dictionaries — loaded from parts
(function () {
  var all = [];
  for (var i = 0; i < 8; i++) {
    var p = window["__NW_PART" + i];
    if (p && p.length) all = all.concat(p);
  }
  window.NEPALI_WORDS = new Set(all);
})();
