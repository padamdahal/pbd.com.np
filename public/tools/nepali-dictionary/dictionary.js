(() => {
  "use strict";

  const BASE = "/tools/nepali-dictionary/";

  /** @type {{i:number, first:string, last:string, count:number}[]} */
  let index = [];
  /** @type {Map<number, Array<{w:string, d:Array<{g?:string, e?:string, s:string[]}>}>>} */
  const chunkCache = new Map();
  const loadingChunks = new Set();

  const input = document.getElementById("dict-input");
  const suggestionsEl = document.getElementById("suggestions");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("dict-count");
  const romanHintEl = document.getElementById("roman-hint");
  const historyWrapEl = document.getElementById("history-wrap");
  const historyListEl = document.getElementById("history-list");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnSearch = document.getElementById("btn-search");
  const btnRandom = document.getElementById("btn-random");
  const btnClear = document.getElementById("btn-clear");
  const wotdBtn = document.getElementById("wotd-btn");

  let activeSuggestion = -1;
  let currentSuggestions = [];
  let debounceTimer = null;

  const HISTORY_KEY = "pbd-dict-history";
  const MAX_HISTORY = 8;

  const GRAMMAR_LABELS = {
    "ना.": "नाम (Noun)",
    "वि.": "विशेषण (Adjective)",
    "क्रि.": "क्रिया (Verb)",
    "सक्रि.": "सकर्मक क्रिया (Transitive Verb)",
    "अक्रि.": "अकर्मक क्रिया (Intransitive Verb)",
    "प्रेक्रि.": "प्रेरणार्थक क्रिया (Causative Verb)",
    "क्रि.वि.": "क्रियाविशेषण (Adverb)",
    "नायो.": "नामयोगी (Postposition)",
    "नि.": "निपात / विस्मयादिबोधक (Particle / Interjection)",
    "पूस.": "पूर्वसर्ग (Prefix)",
    "प्रत्य.": "प्रत्यय (Suffix)",
    "सर्व.": "सर्वनाम (Pronoun)",
    "स.": "संयोजक (Conjunction)",
    "संयो.": "संयोजक (Conjunction)",
    "विस्म.": "विस्मयादिबोधक (Interjection)",
    "अनु.": "अनुकरणात्मक (Onomatopoeia)",
    "तु.": "तुक्का / उखान (Idiom)",
  };

  const ETYM_LABELS = {
    "[सं.]": "संस्कृत (Sanskrit)",
    "[ने.]": "नेपाली (Nepali)",
    "[फा.]": "फारसी (Persian)",
    "[अ.]": "अरबी (Arabic)",
    "[अङ्.]": "अङ्ग्रेजी (English)",
    "[अं.]": "अङ्ग्रेजी (English)",
    "[हि.]": "हिन्दी (Hindi)",
    "[प्रा.]": "प्राकृत (Prakrit)",
    "[देश.]": "देशज (Native)",
    "[ति.]": "तिब्बती (Tibetan)",
  };

  const WOTD_POOL = [
    "किरण", "नेपाल", "ज्ञान", "माया", "शिक्षा", "स्वतन्त्रता", "सपना", "प्रकृति",
    "संस्कृति", "परिवार", "मित्रता", "इतिहास", "साहित्य", "सफलता", "आनन्द",
    "कविता", "विश्वास", "सत्य", "उत्साह", "आशा", "करुणा", "धैर्य", "परिश्रम",
    "सद्भाव", "चेतना", "कल्पना", "गौरव", "सौन्दर्य", "जागरण", "नमस्ते",
  ];

  /* --- Compact Romanized → Devanagari Phonetic Helper --- */
  const H = "\u094D";
  const CONS = [
    ["ksh", "क्ष"], ["chh", "छ"], ["x", "क्ष"], ["gy", "ज्ञ"], ["ch", "च"],
    ["kh", "ख"], ["gh", "घ"], ["ng", "ङ"], ["jh", "झ"], ["Th", "ठ"],
    ["Dh", "ढ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"],
    ["sh", "श"], ["Sh", "ष"], ["Yn", "ञ"], ["k", "क"], ["g", "ग"],
    ["c", "च"], ["j", "ज"], ["T", "ट"], ["D", "ड"], ["N", "ण"],
    ["t", "त"], ["d", "द"], ["n", "न"], ["p", "प"], ["f", "फ"],
    ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"],
    ["w", "व"], ["v", "व"], ["s", "स"], ["h", "ह"], ["z", "ज"], ["q", "क"],
  ].sort((a, b) => b[0].length - a[0].length);

  const VOW = [
    ["Ri", "ऋ", "ृ"], ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"],
    ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
    ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"],
    ["o", "ओ", "ो"], ["A", "आ", "ा"], ["I", "ई", "ी"], ["U", "ऊ", "ू"],
  ].sort((a, b) => b[0].length - a[0].length);

  const ROMAN_SHORTCUTS = {
    nepal: "नेपाल",
    nepali: "नेपाली",
    namaste: "नमस्ते",
    namaskar: "नमस्कार",
    dhanyabad: "धन्यवाद",
    dhanyawad: "धन्यवाद",
    kathmandu: "काठमाडौँ",
    pokhara: "पोखरा",
    gyan: "ज्ञान",
    vigyan: "विज्ञान",
    bigyan: "विज्ञान",
    shiksha: "शिक्षा",
    siksha: "शिक्षा",
    swatantrata: "स्वतन्त्रता",
    sanskrit: "संस्कृत",
    sanskriti: "संस्कृति",
    bhasha: "भाषा",
    shabdakosh: "शब्दकोश",
    sabdakosh: "शब्दकोश",
    samvidhan: "संविधान",
    sambidhan: "संविधान",
    prakriti: "प्रकृति",
    mitrata: "मित्रता",
    parishram: "परिश्रम",
    biswas: "विश्वास",
    vishwas: "विश्वास",
    aananda: "आनन्द",
    ananda: "आनन्द",
    itihas: "इतिहास",
    sahitya: "साहित्य",
    safalta: "सफलता",
    saphalta: "सफलता",
    sundar: "सुन्दर",
    saundarya: "सौन्दर्य",
    gaurav: "गौरव",
    gaurab: "गौरव",
    sadharan: "साधारण",
    desh: "देश",
    deshbhakti: "देशभक्ति",
    ghar: "घर",
    pariwar: "परिवार",
    parivar: "परिवार",
    sathi: "साथी",
    prem: "प्रेम",
    maya: "माया",
    kiran: "किरण",
    suraj: "सूरज",
    surya: "सूर्य",
    chandra: "चन्द्र",
    akash: "आकाश",
    aakash: "आकाश",
    prithvi: "पृथ्वी",
    himal: "हिमाल",
    nadi: "नदी",
    pani: "पानी",
    hawa: "हावा",
    aago: "आगो",
    phool: "फूल",
    ful: "फुल",
    rukh: "रूख",
    charo: "चरो",
    manis: "मानिस",
    manche: "मान्छे",
    jiban: "जीवन",
    jiwan: "जीवन",
    jeevan: "जीवन",
    samay: "समय",
    samaya: "समय",
    sapana: "सपना",
    kalpana: "कल्पना",
    chetana: "चेतना",
    jagaran: "जागरण",
    dhairya: "धैर्य",
    karuna: "करुणा",
    satya: "सत्य",
    shanti: "शान्ति",
    santi: "शान्ति",
    utsah: "उत्साह",
    aasha: "आशा",
    asha: "आशा",
    khushi: "खुशी",
    khusi: "खुसी",
    dukha: "दुःख",
    sukha: "सुख",
    ramro: "राम्रो",
    naramro: "नराम्रो",
    thulo: "ठूलो",
    sano: "सानो",
    nava: "नव",
    naya: "नयाँ",
    purano: "पुरानो",
    kitab: "किताब",
    pustak: "पुस्तक",
    kalam: "कलम",
    vidyalaya: "विद्यालय",
    bidyalaya: "विद्यालय",
    guru: "गुरु",
    vidyarthi: "विद्यार्थी",
    shram: "श्रम",
    kal: "कल",
    aaja: "आज",
    bholi: "भोलि",
    hijo: "हिजो",
  };

  function matchFromList(list, s, i) {
    for (const e of list) if (s.startsWith(e[0], i)) return e;
    const c = s[i];
    if (c && c !== c.toLowerCase()) {
      const lw = c.toLowerCase() + s.slice(i + 1);
      for (const e of list) if (lw.startsWith(e[0])) return e;
    }
    return null;
  }

  function romanToDevanagari(w) {
    let out = "";
    let i = 0;
    let pend = false;
    while (i < w.length) {
      if (i > 0 && (w[i] === "M" || w[i] === "H")) {
        if (w.startsWith("MM", i)) {
          out += "\u0901";
          i += 2;
        } else {
          out += w[i] === "M" ? "\u0902" : "\u0903";
          i++;
        }
        pend = false;
        continue;
      }
      const c = matchFromList(CONS, w, i);
      if (c) {
        out += (pend ? H : "") + c[1];
        i += c[0].length;
        pend = true;
        const v = matchFromList(VOW, w, i);
        if (v) {
          out += v[2];
          i += v[0].length;
          pend = false;
        } else if (w[i] === "^") {
          out += H;
          i++;
          pend = false;
        }
        continue;
      }
      const v = matchFromList(VOW, w, i);
      if (v) {
        out += v[1];
        i += v[0].length;
        pend = false;
        continue;
      }
      out += w[i];
      i++;
      pend = false;
    }
    return out;
  }

  function isRomanInput(str) {
    return /^[A-Za-z\s^]+$/.test(str);
  }

  function romanCandidates(rawStr) {
    const clean = rawStr.trim();
    if (!clean) return [];
    const word = clean.split(/\s+/)[0];
    const lw = word.toLowerCase();
    const out = new Set();

    if (ROMAN_SHORTCUTS[lw]) out.add(ROMAN_SHORTCUTS[lw]);
    out.add(romanToDevanagari(word));
    if (word !== lw) out.add(romanToDevanagari(lw));

    // Common phonetic variations for Nepali words
    for (let i = 0; i < lw.length && out.size < 8; i++) {
      const c = lw[i];
      const n = lw[i + 1];
      if ("tdn".includes(c) && n !== "h" && n !== "g") {
        out.add(romanToDevanagari(lw.slice(0, i) + c.toUpperCase() + lw.slice(i + 1)));
      }
      if (c === "s" && n !== "h") {
        out.add(romanToDevanagari(lw.slice(0, i) + "sh" + lw.slice(i + 1)));
      }
      if (c === "v") {
        out.add(romanToDevanagari(lw.slice(0, i) + "b" + lw.slice(i + 1)));
      }
      if (c === "b") {
        out.add(romanToDevanagari(lw.slice(0, i) + "v" + lw.slice(i + 1)));
      }
      if (c === "a" && n !== "a" && lw[i - 1] !== "a") {
        out.add(romanToDevanagari(lw.slice(0, i) + "aa" + lw.slice(i + 1)));
      }
      if (c === "i" && n !== "i") {
        out.add(romanToDevanagari(lw.slice(0, i) + "ee" + lw.slice(i + 1)));
      }
      if (c === "u" && n !== "u") {
        out.add(romanToDevanagari(lw.slice(0, i) + "oo" + lw.slice(i + 1)));
      }
    }

    // Matching shortcuts by prefix
    for (const [k, val] of Object.entries(ROMAN_SHORTCUTS)) {
      if (k.startsWith(lw) && out.size < 8) out.add(val);
    }

    return Array.from(out).filter(Boolean);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(msg, type = "") {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (type ? " " + type : "");
  }

  function showEmpty() {
    resultEl.hidden = true;
    resultEl.innerHTML = "";
    emptyEl.hidden = false;
  }

  function hideEmpty() {
    emptyEl.hidden = true;
  }

  function updateRomanHint(query) {
    if (!romanHintEl) return;
    if (!query || !isRomanInput(query)) {
      romanHintEl.hidden = true;
      romanHintEl.innerHTML = "";
      return;
    }
    const candidates = romanCandidates(query).slice(0, 5);
    if (!candidates.length) {
      romanHintEl.hidden = true;
      return;
    }
    romanHintEl.hidden = false;
    romanHintEl.innerHTML =
      `<span class="roman-label">Devanagari:</span> ` +
      candidates
        .map(
          (w) =>
            `<button type="button" class="roman-chip" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`
        )
        .join("");
  }

  /* --- History Management --- */
  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveToHistory(word) {
    if (!word) return;
    try {
      const list = loadHistory().filter((w) => w !== word);
      list.unshift(word);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
      renderHistory();
    } catch {}
  }

  function renderHistory() {
    if (!historyWrapEl || !historyListEl) return;
    const list = loadHistory();
    if (!list.length) {
      historyWrapEl.hidden = true;
      historyListEl.innerHTML = "";
      return;
    }
    historyWrapEl.hidden = false;
    historyListEl.innerHTML = list
      .map(
        (w) =>
          `<button type="button" data-word="${escapeHtml(w)}" lang="ne">${escapeHtml(w)}</button>`
      )
      .join("");
  }

  function getDailyWotd() {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const str = fmt.format(new Date());
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
      }
      return WOTD_POOL[hash % WOTD_POOL.length];
    } catch {
      return WOTD_POOL[0];
    }
  }

  function initWotd() {
    if (!wotdBtn) return;
    const word = getDailyWotd();
    wotdBtn.textContent = word;
    wotdBtn.dataset.word = word;
    wotdBtn.addEventListener("click", () => {
      input.value = word;
      updateRomanHint(word);
      searchWord(word);
    });
  }

  /* --- Chunk Index & Binary Lookup --- */
  async function loadIndex() {
    if (index.length) return index;
    setStatus("Loading dictionary index…", "loading");
    const res = await fetch(BASE + "index.json");
    if (!res.ok) throw new Error("Could not load index");
    index = await res.json();
    const total = index.reduce((s, c) => s + c.count, 0);
    if (countEl) countEl.textContent = total.toLocaleString("en-NP") + " words";
    setStatus("");
    return index;
  }

  async function loadChunk(i) {
    if (chunkCache.has(i)) return chunkCache.get(i);
    if (loadingChunks.has(i)) {
      while (loadingChunks.has(i)) {
        await new Promise((r) => setTimeout(r, 40));
      }
      return chunkCache.get(i);
    }
    loadingChunks.add(i);
    try {
      const res = await fetch(BASE + `dict-${i}.json`);
      if (!res.ok) throw new Error("Chunk " + i + " failed");
      const data = await res.json();
      chunkCache.set(i, data);
      return data;
    } finally {
      loadingChunks.delete(i);
    }
  }

  function findChunkForWord(word) {
    if (!index.length) return -1;
    let lo = 0;
    let hi = index.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = index[mid];
      if (word < c.first) hi = mid - 1;
      else if (word > c.last) lo = mid + 1;
      else return mid;
    }
    return Math.max(0, Math.min(lo, index.length - 1));
  }

  function findChunksForPrefix(prefix) {
    if (!prefix || !index.length) return [];
    const ids = new Set();
    const primary = findChunkForWord(prefix);
    ids.add(primary);
    if (primary > 0) ids.add(primary - 1);
    if (primary < index.length - 1) ids.add(primary + 1);
    for (let i = 0; i < index.length; i++) {
      const c = index[i];
      if (
        (prefix >= c.first && prefix <= c.last) ||
        c.first.startsWith(prefix) ||
        c.last.startsWith(prefix) ||
        (c.first < prefix && c.last > prefix)
      ) {
        ids.add(i);
      }
    }
    return Array.from(ids).sort((a, b) => a - b);
  }

  async function findExactEntry(word) {
    const chunkId = findChunkForWord(word);
    if (chunkId < 0) return null;

    const chunk = await loadChunk(chunkId);
    let lo = 0;
    let hi = chunk.length - 1;
    let idx = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = chunk[mid].w;
      if (w === word) {
        idx = mid;
        break;
      }
      if (w < word) lo = mid + 1;
      else hi = mid - 1;
    }

    if (idx !== -1) {
      return { entry: chunk[idx], chunk, idx };
    }

    const linearIdx = chunk.findIndex((e) => e.w === word);
    if (linearIdx !== -1) {
      return { entry: chunk[linearIdx], chunk, idx: linearIdx };
    }

    for (const nid of [chunkId - 1, chunkId + 1]) {
      if (nid < 0 || nid >= index.length) continue;
      const nchunk = await loadChunk(nid);
      const nIdx = nchunk.findIndex((e) => e.w === word);
      if (nIdx !== -1) {
        return { entry: nchunk[nIdx], chunk: nchunk, idx: nIdx };
      }
    }

    return null;
  }

  async function searchWord(rawInput) {
    const query = (rawInput || "").trim();
    if (!query) {
      showEmpty();
      setStatus("");
      updateUrlQuery("");
      return;
    }

    await loadIndex();
    setStatus("Looking up…", "loading");
    hideEmpty();

    try {
      if (isRomanInput(query)) {
        const candidates = romanCandidates(query);
        for (const cand of candidates) {
          const hit = await findExactEntry(cand);
          if (hit) {
            input.value = hit.entry.w;
            updateRomanHint("");
            renderEntry(hit.entry, hit.chunk, hit.idx);
            saveToHistory(hit.entry.w);
            updateUrlQuery(hit.entry.w);
            setStatus("");
            return;
          }
        }
        // Fallback: prefix suggestions for the Romanized primary candidate
        const prefixMatches = await collectPrefixEntries(candidates[0] || "", 6);
        if (prefixMatches.length) {
          renderEntry(prefixMatches[0].entry, prefixMatches[0].chunk, prefixMatches[0].idx);
          input.value = prefixMatches[0].entry.w;
          updateRomanHint("");
          saveToHistory(prefixMatches[0].entry.w);
          updateUrlQuery(prefixMatches[0].entry.w);
          setStatus("");
          return;
        }
        showNotFound(query, candidates);
        return;
      }

      const hit = await findExactEntry(query);
      if (hit) {
        renderEntry(hit.entry, hit.chunk, hit.idx);
        saveToHistory(hit.entry.w);
        updateUrlQuery(hit.entry.w);
        setStatus("");
      } else {
        const related = await collectPrefixWords(query.slice(0, Math.max(1, query.length - 1)), 6);
        showNotFound(query, related);
      }
    } catch (err) {
      console.error(err);
      setStatus("Could not load dictionary data. Check your connection and try again.", "error");
      showEmpty();
    }
  }

  function updateUrlQuery(word) {
    try {
      const url = new URL(location.href);
      if (word) url.searchParams.set("q", word);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url.toString());
    } catch {}
  }

  async function collectPrefixWords(prefix, limit = 12) {
    if (!prefix) return [];
    const chunkIds = findChunksForPrefix(prefix);
    const matches = [];
    for (const id of chunkIds) {
      if (matches.length >= limit) break;
      try {
        const chunk = await loadChunk(id);
        for (const e of chunk) {
          if (e.w.startsWith(prefix)) {
            matches.push(e.w);
            if (matches.length >= limit) break;
          }
        }
      } catch {}
    }
    return [...new Set(matches)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).slice(0, limit);
  }

  async function collectPrefixEntries(prefix, limit = 4) {
    if (!prefix) return [];
    const chunkIds = findChunksForPrefix(prefix);
    const results = [];
    for (const id of chunkIds) {
      if (results.length >= limit) break;
      try {
        const chunk = await loadChunk(id);
        for (let idx = 0; idx < chunk.length; idx++) {
          if (chunk[idx].w.startsWith(prefix)) {
            results.push({ entry: chunk[idx], chunk, idx });
            if (results.length >= limit) break;
          }
        }
      } catch {}
    }
    return results;
  }

  function showNotFound(word, suggestionsList = []) {
    hideEmpty();
    resultEl.hidden = false;
    const altHtml = suggestionsList.length
      ? `<div class="nearby-wrap"><span class="nearby-label">Did you mean:</span> <div class="nearby-btns">${suggestionsList
          .slice(0, 6)
          .map((w) => `<button type="button" class="nearby-btn" data-word="${escapeHtml(w)}" lang="ne">${escapeHtml(w)}</button>`)
          .join("")}</div></div>`
      : "";
    resultEl.innerHTML = `
      <div class="not-found">
        <strong>No entry found for “${escapeHtml(word)}”</strong>
        <p>Try typing in Nepali Unicode, adjusting spelling, or searching a root word.</p>
        ${altHtml}
      </div>`;
    bindResultWordButtons();
    setStatus("");
  }

  function formatGrammar(g) {
    if (!g) return "";
    const trimmed = g.trim();
    const expanded = GRAMMAR_LABELS[trimmed];
    return expanded ? `${trimmed} · ${expanded}` : trimmed;
  }

  function formatEtymology(e) {
    if (!e) return "";
    const trimmed = e.trim();
    const expanded = ETYM_LABELS[trimmed];
    return expanded ? `${trimmed} ${expanded}` : trimmed;
  }

  function entryToPlainText(entry) {
    const lines = [entry.w];
    (entry.d || []).forEach((def, idx) => {
      const meta = [def.g, def.e].filter(Boolean).join(" ");
      if (meta) lines.push(`[${idx + 1}] ${meta}`);
      (def.s || []).forEach((sense, sIdx) => {
        lines.push(`  ${sIdx + 1}. ${sense}`);
      });
    });
    lines.push("— Powered By Digital (https://pbd.com.np/tools/nepali-dictionary/)");
    return lines.join("\n");
  }

  function renderEntry(entry, chunk = null, idx = -1) {
    hideEmpty();
    resultEl.hidden = false;
    const defs = entry.d || [];

    let html = `
      <div class="entry-head">
        <h2 class="entry-word" lang="ne">${escapeHtml(entry.w)}</h2>
        <div class="entry-tools">
          <button type="button" class="btn btn-sm" id="btn-copy-entry">Copy</button>
          <button type="button" class="btn btn-sm" id="btn-share-entry">Copy link</button>
        </div>
      </div>`;

    defs.forEach((def) => {
      html += `<div class="def-block">`;
      if (def.g || def.e) {
        html += `<div class="def-meta">`;
        if (def.g) html += `<span class="grammar">${escapeHtml(formatGrammar(def.g))}</span>`;
        if (def.g && def.e) html += `<span class="meta-sep" aria-hidden="true">·</span>`;
        if (def.e) html += `<span class="etymology">${escapeHtml(formatEtymology(def.e))}</span>`;
        html += `</div>`;
      }
      if (def.s && def.s.length) {
        html += `<ol class="senses" lang="ne">`;
        def.s.forEach((sense) => {
          html += `<li>${escapeHtml(sense)}</li>`;
        });
        html += `</ol>`;
      }
      html += `</div>`;
    });

    // Nearby / Related entries in alphabet order
    if (chunk && idx !== -1) {
      const nearby = [];
      for (let offset = -2; offset <= 3; offset++) {
        if (offset === 0) continue;
        const nIdx = idx + offset;
        if (nIdx >= 0 && nIdx < chunk.length) {
          nearby.push(chunk[nIdx].w);
        }
      }
      if (nearby.length) {
        html += `
          <div class="nearby-wrap">
            <span class="nearby-label">Nearby words:</span>
            <div class="nearby-btns">
              ${nearby
                .map(
                  (w) =>
                    `<button type="button" class="nearby-btn" data-word="${escapeHtml(w)}" lang="ne">${escapeHtml(w)}</button>`
                )
                .join("")}
            </div>
          </div>`;
      }
    }

    resultEl.innerHTML = html;

    const copyBtn = document.getElementById("btn-copy-entry");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(entryToPlainText(entry));
          copyBtn.textContent = "Copied";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1600);
        } catch {
          setStatus("Copy not supported in this browser.", "error");
        }
      });
    }

    const shareBtn = document.getElementById("btn-share-entry");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const shareUrl = `${location.origin}${BASE}?q=${encodeURIComponent(entry.w)}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          shareBtn.textContent = "Link copied";
          setTimeout(() => {
            shareBtn.textContent = "Copy link";
          }, 1600);
        } catch {
          setStatus("Could not copy link.", "error");
        }
      });
    }

    bindResultWordButtons();
  }

  function bindResultWordButtons() {
    resultEl.querySelectorAll("button[data-word]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const word = btn.dataset.word;
        input.value = word;
        updateRomanHint("");
        searchWord(word);
      });
    });
  }

  async function getSuggestions(rawQuery) {
    const q = (rawQuery || "").trim();
    if (!q) {
      currentSuggestions = [];
      renderSuggestions();
      return;
    }
    await loadIndex();

    let matches = [];
    if (isRomanInput(q)) {
      const candidates = romanCandidates(q).slice(0, 3);
      for (const cand of candidates) {
        if (matches.length >= 12) break;
        const found = await collectPrefixWords(cand, 6);
        matches.push(...found);
      }
      matches = [...new Set(matches)].slice(0, 12);
    } else {
      matches = await collectPrefixWords(q, 12);
    }

    currentSuggestions = matches;
    renderSuggestions();
  }

  function renderSuggestions() {
    if (!currentSuggestions.length) {
      suggestionsEl.classList.remove("open");
      suggestionsEl.innerHTML = "";
      activeSuggestion = -1;
      return;
    }
    const prefix = input.value.trim();
    suggestionsEl.innerHTML = currentSuggestions
      .map((w, i) => {
        const highlighted =
          !isRomanInput(prefix) && prefix && w.startsWith(prefix)
            ? `<span class="match">${escapeHtml(w.slice(0, prefix.length))}</span>${escapeHtml(
                w.slice(prefix.length)
              )}`
            : escapeHtml(w);
        return `<li role="option" data-idx="${i}" ${
          i === activeSuggestion ? 'aria-selected="true"' : ""
        }>${highlighted}</li>`;
      })
      .join("");
    suggestionsEl.classList.add("open");
  }

  function selectSuggestion(idx) {
    if (idx < 0 || idx >= currentSuggestions.length) return;
    const word = currentSuggestions[idx];
    input.value = word;
    suggestionsEl.classList.remove("open");
    currentSuggestions = [];
    activeSuggestion = -1;
    updateRomanHint("");
    searchWord(word);
  }

  async function randomWord() {
    await loadIndex();
    setStatus("Picking a random word…", "loading");
    try {
      const total = index.reduce((s, c) => s + c.count, 0);
      let r = Math.floor(Math.random() * total);
      let chunkId = 0;
      for (let i = 0; i < index.length; i++) {
        if (r < index[i].count) {
          chunkId = i;
          break;
        }
        r -= index[i].count;
      }
      const chunk = await loadChunk(chunkId);
      const safeIdx = Math.min(r, chunk.length - 1);
      const entry = chunk[safeIdx];
      input.value = entry.w;
      updateRomanHint("");
      renderEntry(entry, chunk, safeIdx);
      saveToHistory(entry.w);
      updateUrlQuery(entry.w);
      setStatus("");
      suggestionsEl.classList.remove("open");
    } catch (err) {
      console.error(err);
      setStatus("Could not load a random word.", "error");
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    updateRomanHint(q);
    if (!q) {
      suggestionsEl.classList.remove("open");
      currentSuggestions = [];
      showEmpty();
      setStatus("");
      updateUrlQuery("");
      return;
    }
    debounceTimer = setTimeout(() => getSuggestions(q), 180);
  });

  input.addEventListener("keydown", (e) => {
    if (!suggestionsEl.classList.contains("open") || !currentSuggestions.length) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchWord(input.value);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSuggestion = Math.min(activeSuggestion + 1, currentSuggestions.length - 1);
      renderSuggestions();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSuggestion = Math.max(activeSuggestion - 1, -1);
      renderSuggestions();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestion >= 0) selectSuggestion(activeSuggestion);
      else {
        suggestionsEl.classList.remove("open");
        searchWord(input.value);
      }
    } else if (e.key === "Escape") {
      suggestionsEl.classList.remove("open");
      activeSuggestion = -1;
    }
  });

  suggestionsEl.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-idx]");
    if (!li) return;
    selectSuggestion(Number(li.dataset.idx));
  });

  if (romanHintEl) {
    romanHintEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-word]");
      if (!btn) return;
      const word = btn.dataset.word;
      input.value = word;
      suggestionsEl.classList.remove("open");
      updateRomanHint("");
      searchWord(word);
    });
  }

  if (historyListEl) {
    historyListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-word]");
      if (!btn) return;
      const word = btn.dataset.word;
      input.value = word;
      updateRomanHint("");
      searchWord(word);
    });
  }

  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", () => {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {}
      renderHistory();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      suggestionsEl.classList.remove("open");
    }
  });

  btnSearch.addEventListener("click", () => {
    suggestionsEl.classList.remove("open");
    searchWord(input.value);
  });
  btnRandom.addEventListener("click", randomWord);
  btnClear.addEventListener("click", () => {
    input.value = "";
    suggestionsEl.classList.remove("open");
    currentSuggestions = [];
    updateRomanHint("");
    showEmpty();
    setStatus("");
    updateUrlQuery("");
    input.focus();
  });

  document.querySelectorAll(".samples button[data-word]").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.word;
      updateRomanHint("");
      searchWord(btn.dataset.word);
    });
  });

  initWotd();
  renderHistory();

  const params = new URLSearchParams(location.search);
  const initial = params.get("q") || params.get("word");
  if (initial) {
    input.value = initial;
    updateRomanHint(initial);
    searchWord(initial);
  } else {
    loadIndex().catch(() => {});
  }
})();
