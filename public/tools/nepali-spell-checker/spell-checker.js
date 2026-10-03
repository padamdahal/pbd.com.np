/**
 * Nepali Unicode Spell Checker
 * Dictionary stems: Madan Puraskar Pustakalaya (ne_NP Hunspell, LGPL 2.1)
 * via wooorm/dictionaries
 */
(function () {
  "use strict";

  const WORD_RE = /[\u0900-\u097F]+/g;
  const COMMON_REPLACEMENTS = [
    ["ि", "ी"], ["ी", "ि"],
    ["ु", "ू"], ["ू", "ु"],
    ["आ", "ा"], ["ा", "आ"],
    ["इ", "ई"], ["ई", "इ"],
    ["ओ", "ो"], ["ो", "ओ"],
    ["ए", "े"], ["े", "ए"],
    ["औ", "ो"], ["ो", "औ"],
    ["ो", "ौ"], ["ौ", "ो"],
    ["ं", "ँ"], ["ँ", "ं"],
    ["स", "श"], ["श", "स"],
    ["ष्", "स्"], ["स्", "ष्"],
    ["क्ष", "छ"], // occasional confusions
  ];

  let dict = null;
  let ready = false;

  function loadDict() {
    if (window.NEPALI_WORDS) {
      dict = window.NEPALI_WORDS;
      ready = true;
      return true;
    }
    return false;
  }

  function isCorrect(word) {
    if (!dict) return true;
    if (dict.has(word)) return true;
    // Allow pure digits
    if (/^[०-९]+$/.test(word)) return true;
    return false;
  }

  function levenshtein(a, b, maxDist) {
    if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
    const m = a.length, n = b.length;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      let minRow = curr[0];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        if (curr[j] < minRow) minRow = curr[j];
      }
      if (minRow > maxDist) return maxDist + 1;
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  function generateCandidates(word) {
    const candidates = new Set();
    // Common replacement pairs
    for (const [from, to] of COMMON_REPLACEMENTS) {
      if (word.includes(from)) {
        candidates.add(word.replace(from, to));
        // try all occurrences (simple: replace first then rest via loop if needed)
        let idx = 0;
        let w = word;
        while ((idx = w.indexOf(from, idx)) !== -1) {
          candidates.add(w.slice(0, idx) + to + w.slice(idx + from.length));
          idx += from.length;
        }
      }
    }
    // Single char delete
    for (let i = 0; i < word.length; i++) {
      candidates.add(word.slice(0, i) + word.slice(i + 1));
    }
    // Adjacent transpose
    for (let i = 0; i < word.length - 1; i++) {
      candidates.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
    }
    // Substitute with common chars (limited)
    const commonChars = "ािीुूेैोौंःँअआइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञ";
    for (let i = 0; i < word.length; i++) {
      for (const ch of commonChars) {
        if (ch !== word[i]) {
          candidates.add(word.slice(0, i) + ch + word.slice(i + 1));
        }
      }
    }
    // Insert common (limited positions)
    for (let i = 0; i <= word.length; i++) {
      for (const ch of "ािीुूेैोौंःँ") {
        candidates.add(word.slice(0, i) + ch + word.slice(i));
      }
    }
    return candidates;
  }

  function suggest(word, maxSuggestions = 6) {
    if (!dict || isCorrect(word)) return [];
    const scored = [];
    const cands = generateCandidates(word);
    for (const c of cands) {
      if (c && dict.has(c) && c !== word) {
        const dist = levenshtein(word, c, 2);
        if (dist <= 2) scored.push({ word: c, dist });
      }
    }
    // Also scan dict for close length words if few suggestions (expensive, limit)
    if (scored.length < 3) {
      const len = word.length;
      let checked = 0;
      for (const d of dict) {
        if (checked++ > 8000) break; // safety
        if (Math.abs(d.length - len) > 1) continue;
        const dist = levenshtein(word, d, 1);
        if (dist <= 1 && d !== word) {
          scored.push({ word: d, dist });
        }
      }
    }
    scored.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word, "ne"));
    const seen = new Set();
    const out = [];
    for (const s of scored) {
      if (!seen.has(s.word)) {
        seen.add(s.word);
        out.push(s.word);
        if (out.length >= maxSuggestions) break;
      }
    }
    return out;
  }

  function tokenize(text) {
    const tokens = [];
    let last = 0;
    let m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text)) !== null) {
      if (m.index > last) {
        tokens.push({ type: "text", value: text.slice(last, m.index) });
      }
      tokens.push({ type: "word", value: m[0], start: m.index, end: m.index + m[0].length });
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      tokens.push({ type: "text", value: text.slice(last) });
    }
    return tokens;
  }

  function checkText(text) {
    const tokens = tokenize(text);
    const errors = [];
    let wordCount = 0;
    for (const t of tokens) {
      if (t.type === "word") {
        wordCount++;
        if (!isCorrect(t.value)) {
          errors.push({
            word: t.value,
            start: t.start,
            end: t.end,
            suggestions: suggest(t.value),
          });
        }
      }
    }
    return { tokens, errors, wordCount };
  }

  // UI
  const inputEl = document.getElementById("spell-input");
  const resultEl = document.getElementById("spell-result");
  const statusEl = document.getElementById("spell-status");
  const checkBtn = document.getElementById("btn-check");
  const clearBtn = document.getElementById("btn-clear");
  const copyBtn = document.getElementById("btn-copy");
  const sampleBtns = document.querySelectorAll("[data-sample]");

  function renderResult(data) {
    if (!data || !data.tokens) {
      resultEl.innerHTML = "";
      return;
    }
    let html = "";
    for (const t of data.tokens) {
      if (t.type === "text") {
        html += escapeHtml(t.value);
      } else {
        const err = data.errors.find((e) => e.start === t.start);
        if (err) {
          const sug = err.suggestions.slice(0, 4).join(" · ") || "—";
          html += `<span class="misspelled" data-word="${escapeAttr(t.value)}" title="Suggestions: ${escapeAttr(sug)}" tabindex="0">${escapeHtml(t.value)}</span>`;
        } else {
          html += escapeHtml(t.value);
        }
      }
    }
    resultEl.innerHTML = html || "<span class='hint'>No text to check.</span>";

    // click handlers for suggestions
    resultEl.querySelectorAll(".misspelled").forEach((el) => {
      el.addEventListener("click", () => showSuggestions(el));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showSuggestions(el);
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  let activePopup = null;
  function showSuggestions(el) {
    closePopup();
    const word = el.dataset.word;
    const err = lastResult && lastResult.errors.find((e) => e.word === word);
    const sugs = (err && err.suggestions) || suggest(word);
    const pop = document.createElement("div");
    pop.className = "sug-popup";
    pop.innerHTML =
      `<div class="sug-head">“${escapeHtml(word)}” – सुझावहरू</div>` +
      (sugs.length
        ? sugs.map((s) => `<button type="button" class="sug-item" data-replace="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join("")
        : `<div class="sug-none">कुनै सुझाव भेटिएन</div>`);
    document.body.appendChild(pop);
    activePopup = pop;

    const rect = el.getBoundingClientRect();
    pop.style.left = Math.min(rect.left, window.innerWidth - 220) + "px";
    pop.style.top = rect.bottom + window.scrollY + 6 + "px";

    pop.querySelectorAll(".sug-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const replacement = btn.dataset.replace;
        const text = inputEl.value;
        // replace first occurrence of this exact word (simple)
        const re = new RegExp(escapeRegExp(word));
        inputEl.value = text.replace(re, replacement);
        closePopup();
        runCheck();
      });
    });

    setTimeout(() => {
      document.addEventListener("click", outsideClose, { once: true });
    }, 10);
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function outsideClose(e) {
    if (activePopup && !activePopup.contains(e.target)) closePopup();
  }

  function closePopup() {
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
  }

  let lastResult = null;
  let debounceTimer = null;

  function runCheck() {
    if (!ready && !loadDict()) {
      statusEl.textContent = "Dictionary loading…";
      statusEl.className = "hint";
      return;
    }
    const text = inputEl.value;
    if (!text.trim()) {
      resultEl.innerHTML = "";
      statusEl.textContent = "Type or paste Nepali Unicode text above.";
      statusEl.className = "hint";
      lastResult = null;
      return;
    }
    const data = checkText(text);
    lastResult = data;
    renderResult(data);
    const errCount = data.errors.length;
    if (errCount === 0) {
      statusEl.innerHTML = `<strong>${data.wordCount}</strong> words checked · <span style="color:#0a7a3e">No spelling issues found</span>`;
      statusEl.className = "hint ok";
    } else {
      statusEl.innerHTML = `<strong>${data.wordCount}</strong> words · <span style="color:#b42318">${errCount} possible error${errCount > 1 ? "s" : ""}</span> (click highlighted word for suggestions)`;
      statusEl.className = "hint";
    }
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runCheck, 350);
  }

  if (checkBtn) checkBtn.addEventListener("click", runCheck);
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      resultEl.innerHTML = "";
      statusEl.textContent = "Cleared.";
      statusEl.className = "hint";
      lastResult = null;
      closePopup();
      inputEl.focus();
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = inputEl.value;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy text";
          copyBtn.classList.remove("copied");
        }, 1600);
      } catch {
        // fallback
        inputEl.select();
        document.execCommand("copy");
      }
    });
  }

  sampleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      inputEl.value = btn.dataset.sample || "";
      runCheck();
    });
  });

  inputEl.addEventListener("input", scheduleCheck);

  // init
  function init() {
    if (loadDict()) {
      statusEl.textContent = "Ready. Type or paste Nepali Unicode text.";
      statusEl.className = "hint";
    } else {
      // wait for script
      const s = document.createElement("script");
      s.src = "nepali-words.js";
      s.onload = () => {
        loadDict();
        statusEl.textContent = "Dictionary loaded. Ready.";
        statusEl.className = "hint";
      };
      s.onerror = () => {
        statusEl.textContent = "Failed to load dictionary.";
        statusEl.className = "hint error";
      };
      document.head.appendChild(s);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
