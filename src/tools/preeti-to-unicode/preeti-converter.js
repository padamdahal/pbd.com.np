/**
 * Preeti ↔ Unicode converter for PBD
 * Preeti → Unicode based on Shuvayatra/preeti (FOSS Nepal community rules)
 * Unicode → Preeti uses a practical reverse map for common characters
 */
(function () {
  'use strict';

  // ---- Preeti → Unicode (primary direction) ----
  var PREETI_CHAR_MAP = {
    "÷": "/", "v": "ख", "r": "च", "\"": "ू", "~": "ञ्", "z": "श", "ç": "ॐ", "f": "ा", "b": "द", "n": "ल", "j": "व", "×": "×",
    "V": "ख्", "R": "च्", "ß": "द्म", "^": "६", "Û": "!", "Z": "श्", "F": "ँ", "B": "द्य", "N": "ल्", "Ë": "ङ्ग", "J": "व्",
    "6": "ट", "2": "द्द", "¿": "रू", ">": "श्र", ":": "स्", "§": "ट्ट", "&": "७", "£": "घ्", "•": "ड्ड", ".": "।", "«": "्र",
    "*": "८", "„": "ध्र", "w": "ध", "s": "क", "g": "न", "æ": "“", "c": "अ", "o": "य", "k": "प", "W": "ध्", "Ö": "=",
    "S": "क्", "Ò": "¨", "_": ")", "[": "ृ", "Ú": "’", "G": "न्", "ˆ": "फ्", "C": "ऋ", "O": "इ", "Î": "ङ्ख", "K": "प्",
    "7": "ठ", "¶": "ठ्ठ", "3": "घ", "9": "ढ", "?": "रु", ";": "स", "'": "ु", "#": "३", "¢": "द्घ", "/": "र", "+": "ं",
    "ª": "ङ", "t": "त", "p": "उ", "|": "्र", "x": "ह", "å": "द्व", "d": "म", "`": "ञ", "l": "ि", "h": "ज", "T": "त्",
    "P": "ए", "Ý": "ट्ठ", "\\": "्", "Ù": ";", "X": "ह्", "Å": "हृ", "D": "म्", "@": "२", "Í": "ङ्क", "L": "ी",
    "H": "ज्", "4": "द्ध", "±": "+", "0": "ण्", "<": "?", "8": "ड", "¥": "र्‍", "$": "४", "¡": "ज्ञ्", ",": ",",
    "©": "र", "(": "९", "‘": "ॅ", "u": "ग", "q": "त्र", "}": "ै", "y": "थ", "e": "भ", "a": "ब", "i": "ष्", "‰": "झ्",
    "U": "ग्", "Q": "त्त", "]": "े", "˜": "ऽ", "Y": "थ्", "Ø": "्य", "E": "भ्", "A": "ब्", "M": "ः", "Ì": "न्न",
    "I": "क्ष्", "5": "छ", "´": "झ", "1": "ज्ञ", "°": "ङ्ढ", "=": ".", "Æ": "”", "‹": "ङ्घ", "%": "५", "¤": "झ्",
    "!": "१", "-": "(", "›": "द्र", ")": "०", "…": "‘", "Ü": "%"
  };

  var PREETI_POST_RULES = [
    ["्ा", ""],
    ["(त्र|त्त)([^उभप]+?)m", "$1m$2"],
    ["त्रm", "क्र"],
    ["त्तm", "क्त"],
    ["([^उभप]+?)m", "m$1"],
    ["उm", "ऊ"],
    ["भm", "झ"],
    ["पm", "फ"],
    ["इ{", "ई"],
    ["ि((.्)*[^्])", "$1ि"],
    ["(.[ािीुूृेैोौंःँ]*?){", "{$1"],
    ["((.्)*){", "{$1"],
    ["{", "र्"],
    ["([ाीुूृेैोौंःँ]+?)(्(.्)*[^्])", "$2$1"],
    ["्([ाीुूृेैोौंःँ]+?)((.्)*[^्])", "्$2$1"],
    ["([ंँ])([ािीुूृेैोौः]*)", "$2$1"],
    ["ँँ", "ँ"],
    ["ंं", "ं"],
    ["ेे", "े"],
    ["ैै", "ै"],
    ["ुु", "ु"],
    ["ूू", "ू"],
    ["^ः", ":"],
    ["टृ", "ट्ट"],
    ["ेा", "ाे"],
    ["ैा", "ाै"],
    ["अाे", "ओ"],
    ["अाै", "औ"],
    ["अा", "आ"],
    ["एे", "ऐ"],
    ["ाे", "ो"],
    ["ाै", "ौ"]
  ];

  function preetiToUnicode(text) {
    if (!text) return "";
    var output = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      output += PREETI_CHAR_MAP[ch] !== undefined ? PREETI_CHAR_MAP[ch] : ch;
    }
    for (var r = 0; r < PREETI_POST_RULES.length; r++) {
      output = output.replace(new RegExp(PREETI_POST_RULES[r][0], "g"), PREETI_POST_RULES[r][1]);
    }
    return output;
  }

  // ---- Unicode → Preeti (practical reverse) ----
  var UNICODE_TO_PREETI = [
    ["ङ्ग", "Ë"], ["ङ्ख", "Î"], ["ङ्क", "Í"], ["ङ्घ", "‹"], ["ङ्ढ", "°"],
    ["द्म", "ß"], ["द्य", "B"], ["द्द", "2"], ["द्ध", "4"], ["द्घ", "¢"], ["द्व", "å"],
    ["श्र", ">"], ["ट्ट", "§"], ["ड्ड", "•"], ["ठ्ठ", "¶"], ["ट्ठ", "Ý"],
    ["ज्ञ्", "¡"], ["ज्ञ", "1"], ["त्र", "q"], ["त्त", "Q"], ["न्न", "Ì"],
    ["क्ष्", "I"], ["क्ष", "I"], ["रु", "?"], ["रू", "¿"], ["र्‍", "¥"],
    ["्र", "|"], ["्य", "Ø"], ["हृ", "Å"], ["फ्", "ˆ"],
    ["ख्", "V"], ["च्", "R"], ["श्", "Z"], ["ल्", "N"], ["व्", "J"], ["ध्", "W"],
    ["क्", "S"], ["प्", "K"], ["न्", "G"], ["त्", "T"], ["ह्", "X"], ["म्", "D"],
    ["ज्", "H"], ["ण्", "0"], ["थ्", "Y"], ["भ्", "E"], ["ब्", "A"], ["ग्", "U"],
    ["ष्", "i"], ["झ्", "‰"],
    ["ख", "v"], ["च", "r"], ["श", "z"], ["ा", "f"], ["द", "b"], ["ल", "n"], ["व", "j"],
    ["ट", "6"], ["ठ", "7"], ["घ", "3"], ["ढ", "9"], ["स", ";"], ["ु", "'"], ["र", "/"],
    ["ं", "+"], ["ङ", "ª"], ["त", "t"], ["उ", "p"], ["ह", "x"], ["म", "d"], ["ञ", "`"],
    ["ि", "l"], ["ज", "h"], ["ए", "P"], ["्", "\\"], ["ी", "L"], ["ड", "8"],
    ["ग", "u"], ["थ", "y"], ["भ", "e"], ["ब", "a"], ["ै", "}"], ["े", "]"],
    ["अ", "c"], ["य", "o"], ["प", "k"], ["ऋ", "C"], ["इ", "O"], ["छ", "5"],
    ["झ", "´"], ["ः", "M"], ["ृ", "["], ["ँ", "F"], ["ॐ", "ç"], ["ऽ", "˜"],
    ["।", "."], ["“", "æ"], ["”", "Æ"], ["’", "Ú"], ["‘", "…"],
    ["१", "!"], ["२", "@"], ["३", "#"], ["४", "$"], ["५", "%"],
    ["६", "^"], ["७", "&"], ["८", "*"], ["९", "("], ["०", ")"],
    ["आ", "cf"], ["ई", "O{"], ["ऊ", "pm"], ["ऐ", "P]"], ["ओ", "cf]"], ["औ", "cf}"],
    ["ो", "f]"], ["ौ", "f}"]
  ];

  function unicodeToPreeti(text) {
    if (!text) return "";
    var output = text;
    for (var i = 0; i < UNICODE_TO_PREETI.length; i++) {
      var pair = UNICODE_TO_PREETI[i];
      output = output.split(pair[0]).join(pair[1]);
    }
    return output;
  }

  // ---- UI ----
  var preetiIn = document.getElementById("preeti-in");
  var unicodeOut = document.getElementById("unicode-out");
  var unicodeIn = document.getElementById("unicode-in");
  var preetiOut = document.getElementById("preeti-out");
  var modeTabs = document.querySelectorAll(".mode-tab");
  var panelP2U = document.getElementById("panel-p2u");
  var panelU2P = document.getElementById("panel-u2p");
  var charCountP = document.getElementById("char-count-p");
  var charCountU = document.getElementById("char-count-u");

  function updateCounts() {
    if (charCountP) charCountP.textContent = (preetiIn.value || "").length + " chars";
    if (charCountU) charCountU.textContent = (unicodeIn.value || "").length + " chars";
  }

  function convertP2U() {
    var result = preetiToUnicode(preetiIn.value);
    unicodeOut.value = result;
    updateCounts();
  }

  function convertU2P() {
    var result = unicodeToPreeti(unicodeIn.value);
    preetiOut.value = result;
    updateCounts();
  }

  if (preetiIn) {
    preetiIn.addEventListener("input", convertP2U);
    preetiIn.addEventListener("paste", function () { setTimeout(convertP2U, 0); });
  }
  if (unicodeIn) {
    unicodeIn.addEventListener("input", convertU2P);
    unicodeIn.addEventListener("paste", function () { setTimeout(convertU2P, 0); });
  }

  modeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      modeTabs.forEach(function (t) { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      var mode = tab.getAttribute("data-mode");
      if (mode === "p2u") {
        panelP2U.hidden = false;
        panelU2P.hidden = true;
        preetiIn && preetiIn.focus();
      } else {
        panelP2U.hidden = true;
        panelU2P.hidden = false;
        unicodeIn && unicodeIn.focus();
      }
    });
  });

  function copyText(text, btn) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied(btn);
      }).catch(function () {
        fallbackCopy(text, btn);
      });
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showCopied(btn);
    } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function showCopied(btn) {
    if (!btn) return;
    var original = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, 1600);
  }

  var btnCopyUnicode = document.getElementById("copy-unicode");
  var btnCopyPreeti = document.getElementById("copy-preeti");
  var btnClearP = document.getElementById("clear-p2u");
  var btnClearU = document.getElementById("clear-u2p");

  if (btnCopyUnicode) {
    btnCopyUnicode.addEventListener("click", function () {
      copyText(unicodeOut.value, btnCopyUnicode);
    });
  }
  if (btnCopyPreeti) {
    btnCopyPreeti.addEventListener("click", function () {
      copyText(preetiOut.value, btnCopyPreeti);
    });
  }
  if (btnClearP) {
    btnClearP.addEventListener("click", function () {
      preetiIn.value = "";
      unicodeOut.value = "";
      updateCounts();
      preetiIn.focus();
    });
  }
  if (btnClearU) {
    btnClearU.addEventListener("click", function () {
      unicodeIn.value = "";
      preetiOut.value = "";
      updateCounts();
      unicodeIn.focus();
    });
  }

  document.querySelectorAll("[data-sample]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sample = btn.getAttribute("data-sample");
      var target = btn.getAttribute("data-target");
      if (target === "preeti") {
        preetiIn.value = sample;
        convertP2U();
        document.querySelector('.mode-tab[data-mode="p2u"]').click();
      } else if (target === "unicode") {
        unicodeIn.value = sample;
        convertU2P();
        document.querySelector('.mode-tab[data-mode="u2p"]').click();
      }
    });
  });

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  if (preetiIn) preetiIn.focus();
})();
