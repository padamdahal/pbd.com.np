/**
 * Nepali Number to Words – reusable client-side library
 * https://pbd.com.np/tools/number-to-nepali-words/
 *
 * Usage:
 *   <script src="https://pbd.com.np/tools/number-to-nepali-words/number-words.js"></script>
 *   NepaliNumberToWords.toWords(125000);                    // "एक लाख पच्चीस हजार"
 *   NepaliNumberToWords.toWords(125000.50, { currency: true }); // "एक लाख पच्चीस हजार रुपैयाँ पचास पैसा मात्र"
 *
 * No dependencies. Works offline once loaded. Pure functions – safe to call from anywhere.
 */
(function (global) {
  "use strict";

  var NEP = [
    "शून्य", "एक", "दुई", "तीन", "चार", "पाँच", "छ", "सात", "आठ", "नौ",
    "दश", "एघार", "बाह्र", "तेह्र", "चौध", "पन्ध्र", "सोह्र", "सत्र", "अठार", "उन्नाइस",
    "बीस", "एक्काइस", "बाइस", "तेइस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताइस", "अठ्ठाइस", "उनन्तीस",
    "तीस", "एकतीस", "बत्तीस", "तेत्तीस", "चौँतीस", "पैँतीस", "छत्तीस", "सैंतीस", "अठतीस", "उनन्चालीस",
    "चालीस", "एकचालीस", "बयालीस", "त्रिचालीस", "चौवालीस", "पैंतालीस", "छयालीस", "सत्ताचालीस", "अठचालीस", "उनन्चास",
    "पचास", "एकाउन्न", "बाउन्न", "त्रिपन्न", "चौवन्न", "पचपन्न", "छपन्न", "सन्ताउन्न", "अन्ठाउन्न", "उनन्साठी",
    "साठी", "एकसट्ठी", "बयसट्ठी", "त्रिसट्ठी", "चौसट्ठी", "पैंसट्ठी", "छयसट्ठी", "सतसट्ठी", "अठसट्ठी", "उनन्सत्तरी",
    "सत्तरी", "एकहत्तर", "बहत्तर", "त्रिहत्तर", "चौहत्तर", "पचहत्तर", "छयहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
    "असी", "एकासी", "बयासी", "त्रियासी", "चौरासी", "पचासी", "छयासी", "सतासी", "अठासी", "उनान्नब्बे",
    "नब्बे", "एकानब्बे", "बयानब्बे", "त्रियानब्बे", "चौरानब्बे", "पन्चानब्बे", "छयानब्बे", "सन्तानब्बे", "अन्ठानब्बे", "उनान्सय"
  ];

  var UNITS = ["हजार", "लाख", "करोड", "अर्ब", "खर्ब", "नील", "पद्म", "शंख"];

  function below1000(n) {
    var h = Math.floor(n / 100);
    var r = n % 100;
    var out = [];
    if (h) out.push(NEP[h] + " सय");
    if (r) out.push(NEP[r]);
    return out.join(" ");
  }

  function toWordsInteger(big) {
    if (big === 0n) return NEP[0];
    var parts = [];
    var low = Number(big % 1000n);
    var rest = big / 1000n;
    if (low) parts.push(below1000(low));
    for (var i = 0; i < UNITS.length; i++) {
      if (rest === 0n) break;
      var g = Number(rest % 100n);
      rest = rest / 100n;
      if (g) parts.unshift(NEP[g] + " " + UNITS[i]);
    }
    return parts.join(" ");
  }

  function formatGrouped(s) {
    if (!s || s.length <= 3) return s || "0";
    return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
  }

  function toWords(value, options) {
    options = options || {};
    var currency = !!options.currency;
    var includeDecimalWords = options.includeDecimalWords !== false;

    var raw = String(value == null ? "" : value).trim();
    raw = raw.replace(/[०-९]/g, function (d) {
      return "०१२३४५६७८९".indexOf(d);
    });
    raw = raw.replace(/[,\s]/g, "");

    if (!raw) return "";

    var m = raw.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!m) return "";

    var neg = !!m[1];
    var whole = m[2].replace(/^0+(?=\d)/, "") || "0";
    var frac = m[3] || "";

    if (whole.length > 19) return "";
    if (frac.length > 8) frac = frac.slice(0, 8);

    var words = toWordsInteger(BigInt(whole));

    if (currency) {
      var paisa = "";
      if (frac) {
        var p = (frac + "00").slice(0, 2);
        var pNum = parseInt(p, 10);
        if (pNum > 0) {
          paisa = " " + toWordsInteger(BigInt(pNum)) + " पैसा";
        }
      }
      words = words + " रुपैयाँ" + paisa + " मात्र";
    } else if (frac && includeDecimalWords) {
      words += " दशमलव " + Array.prototype.map.call(frac, function (d) {
        return NEP[+d];
      }).join(" ");
    }

    if (neg) words = "ऋण " + words;
    return words;
  }

  function parse(value) {
    var raw = String(value == null ? "" : value).trim();
    raw = raw.replace(/[०-९]/g, function (d) {
      return "०१२३४५६७८९".indexOf(d);
    }).replace(/[,\s]/g, "");

    var m = raw.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!m) return null;

    var whole = m[2].replace(/^0+(?=\d)/, "") || "0";
    if (whole.length > 19) return null;

    return {
      raw: whole,
      grouped: formatGrouped(whole),
      negative: !!m[1],
      fraction: m[3] || ""
    };
  }

  var api = {
    version: "1.1.0",
    toWords: toWords,
    formatGrouped: formatGrouped,
    parse: parse,
    _NEP: NEP,
    _UNITS: UNITS
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else if (typeof define === "function" && define.amd) {
    define(function () { return api; });
  } else {
    global.NepaliNumberToWords = api;
  }

  function initToolPage() {
    var input = document.getElementById("num");
    if (!input) return;

    var hint = document.getElementById("hint");
    var digitsEl = document.getElementById("digits");
    var wordsEl = document.getElementById("words");
    var copyBtn = document.getElementById("copy");
    var out = document.getElementById("out");
    var clearBtn = document.getElementById("clear");
    var currencyToggle = document.getElementById("currency-mode");

    function update() {
      if (hint) {
        hint.textContent = "";
        hint.classList.remove("error");
      }
      if (out) out.hidden = true;

      var v = input.value;
      if (!v.trim()) return;

      var parsed = api.parse(v);
      if (!parsed) {
        if (hint) {
          hint.textContent = "Enter digits only, for example 250000 or 1,250.75";
          hint.classList.add("error");
        }
        return;
      }

      if (parsed.raw.length > 19) {
        if (hint) {
          hint.textContent = "Too large. Use 19 digits or fewer.";
          hint.classList.add("error");
        }
        return;
      }

      var useCurrency = currencyToggle && currencyToggle.checked;
      var words = api.toWords(v, { currency: useCurrency });

      if (digitsEl) {
        digitsEl.textContent =
          (parsed.negative ? "-" : "") +
          parsed.grouped +
          (parsed.fraction ? "." + parsed.fraction : "");
      }
      if (wordsEl) wordsEl.textContent = words;
      if (out) out.hidden = false;
    }

    input.addEventListener("input", update);
    if (currencyToggle) currencyToggle.addEventListener("change", update);

    document.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = b.getAttribute("data-n");
        update();
        input.focus();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        update();
        input.focus();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = wordsEl ? wordsEl.textContent : "";
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = "Copied";
            copyBtn.classList.add("copied");
            setTimeout(function () {
              copyBtn.textContent = "Copy words";
              copyBtn.classList.remove("copied");
            }, 1400);
          }).catch(function () {
            copyBtn.textContent = "Select and copy";
          });
        } else {
          copyBtn.textContent = "Select and copy";
        }
      });
    }

    var yr = document.getElementById("yr");
    if (yr) yr.textContent = new Date().getFullYear();

    if (input.value) update();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initToolPage);
    } else {
      initToolPage();
    }
  }
})(typeof window !== "undefined" ? window : this);
