(() => {
  "use strict";

  const SOURCE_URL =
    "https://raw.githubusercontent.com/bikashpadhikari/nepali-brihat-sabdakosh-json/main/sabdakosh.json.gz";

  /** @type {Array<{w:string, d:Array<{g?:string, e?:string, s:string[]}>}>} */
  let entries = [];
  /** @type {Map<string, number>} word → index in entries */
  let wordIndex = new Map();
  let loaded = false;
  let loadingPromise = null;

  const input = document.getElementById("dict-input");
  const suggestionsEl = document.getElementById("suggestions");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("dict-count");
  const btnSearch = document.getElementById("btn-search");
  const btnRandom = document.getElementById("btn-random");
  const btnClear = document.getElementById("btn-clear");

  let activeSuggestion = -1;
  let currentSuggestions = [];
  let debounceTimer = null;

  function setStatus(msg, type = "") {
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function cleanSense(s) {
    if (!s) return "";
    // Strip residual HTML tags that appear in the original dump
    return s
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Normalize original Brihat Sabdakosh entry → compact form */
  function normalizeEntry(raw) {
    const word = (raw.word || "").trim();
    if (!word) return null;
    const defs = [];
    for (const d of raw.definitions || []) {
      const senses = (d.senses || [])
        .map(cleanSense)
        .filter(Boolean);
      if (!senses.length) continue;
      const nd = { s: senses };
      if (d.grammar) nd.g = d.grammar;
      if (d.etymology) nd.e = d.etymology;
      defs.push(nd);
    }
    if (!defs.length) return null;
    return { w: word, d: defs };
  }

  async function loadDictionary() {
    if (loaded) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      setStatus("Downloading dictionary (4.4 MB)…", "loading");
      countEl.textContent = "loading…";

      const res = await fetch(SOURCE_URL);
      if (!res.ok) throw new Error("Download failed: " + res.status);

      setStatus("Decompressing…", "loading");

      // Native gzip decompression (Chrome 80+, Firefox 113+, Safari 16.4+)
      const ds = new DecompressionStream("gzip");
      const decompressedStream = res.body.pipeThrough(ds);
      const text = await new Response(decompressedStream).text();

      setStatus("Parsing 120,000+ entries…", "loading");

      const raw = JSON.parse(text);
      const list = [];
      const idx = new Map();

      for (const item of raw) {
        const entry = normalizeEntry(item);
        if (!entry) continue;
        // Keep first occurrence if duplicates exist
        if (idx.has(entry.w)) continue;
        idx.set(entry.w, list.length);
        list.push(entry);
      }

      // Sort for binary search / prefix suggestions
      list.sort((a, b) => a.w.localeCompare(b.w, "ne"));
      // Rebuild index after sort
      idx.clear();
      list.forEach((e, i) => idx.set(e.w, i));

      entries = list;
      wordIndex = idx;
      loaded = true;

      countEl.textContent = entries.length.toLocaleString("en-NP") + " words";
      setStatus("");
    })();

    try {
      await loadingPromise;
    } catch (err) {
      loadingPromise = null;
      console.error(err);
      setStatus(
        "Could not load dictionary. Check your connection and try again.",
        "error"
      );
      throw err;
    }
  }

  /** Binary search for exact word */
  function findExact(word) {
    let lo = 0,
      hi = entries.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const cmp = entries[mid].w.localeCompare(word, "ne");
      if (cmp === 0) return entries[mid];
      if (cmp < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    // Fallback to Map (handles any localeCompare edge cases)
    const i = wordIndex.get(word);
    return i !== undefined ? entries[i] : null;
  }

  /** Collect words that start with prefix (binary-search start then scan) */
  function findPrefix(prefix, limit = 12) {
    if (!prefix) return [];
    let lo = 0,
      hi = entries.length - 1;
    // Find first entry >= prefix
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].w.localeCompare(prefix, "ne") < 0) lo = mid + 1;
      else hi = mid;
    }
    const results = [];
    for (let i = lo; i < entries.length && results.length < limit; i++) {
      if (entries[i].w.startsWith(prefix)) results.push(entries[i].w);
      else if (entries[i].w.localeCompare(prefix, "ne") > 0) break;
    }
    return results;
  }

  async function searchExact(word) {
    word = (word || "").trim();
    if (!word) {
      showEmpty();
      setStatus("");
      return;
    }
    try {
      await loadDictionary();
    } catch {
      return;
    }

    setStatus("Looking up…", "loading");
    hideEmpty();

    const found = findExact(word);
    if (found) {
      renderEntry(found);
      setStatus("");
    } else {
      showNotFound(word);
    }
  }

  function showNotFound(word) {
    hideEmpty();
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="not-found">
        <strong>No entry for “${escapeHtml(word)}”</strong>
        Try a different spelling or a related root form.
      </div>`;
    setStatus("");
  }

  function renderEntry(entry) {
    hideEmpty();
    resultEl.hidden = false;
    const defs = entry.d || [];
    let html = `<h2 class="entry-word" lang="ne">${escapeHtml(entry.w)}</h2>`;
    defs.forEach((def) => {
      html += `<div class="def-block">`;
      html += `<div class="def-meta">`;
      if (def.g) html += `<span class="grammar">${escapeHtml(def.g)}</span>`;
      if (def.e) html += `<span class="etymology">${escapeHtml(def.e)}</span>`;
      html += `</div>`;
      if (def.s && def.s.length) {
        html += `<ol class="senses" lang="ne">`;
        def.s.forEach((sense) => {
          html += `<li>${escapeHtml(sense)}</li>`;
        });
        html += `</ol>`;
      }
      html += `</div>`;
    });
    resultEl.innerHTML = html;
  }

  async function getSuggestions(prefix) {
    prefix = (prefix || "").trim();
    if (prefix.length < 1) {
      currentSuggestions = [];
      renderSuggestions();
      return;
    }
    try {
      await loadDictionary();
    } catch {
      return;
    }
    currentSuggestions = findPrefix(prefix, 12);
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
        const highlighted = prefix
          ? `<span class="match">${escapeHtml(w.slice(0, prefix.length))}</span>${escapeHtml(w.slice(prefix.length))}`
          : escapeHtml(w);
        return `<li role="option" data-idx="${i}" ${i === activeSuggestion ? 'aria-selected="true"' : ""}>${highlighted}</li>`;
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
    searchExact(word);
  }

  async function randomWord() {
    try {
      await loadDictionary();
    } catch {
      return;
    }
    if (!entries.length) return;
    const entry = entries[Math.floor(Math.random() * entries.length)];
    input.value = entry.w;
    renderEntry(entry);
    setStatus("");
    suggestionsEl.classList.remove("open");
  }

  // Events
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      suggestionsEl.classList.remove("open");
      currentSuggestions = [];
      showEmpty();
      setStatus("");
      return;
    }
    debounceTimer = setTimeout(() => getSuggestions(q), 200);
  });

  input.addEventListener("keydown", (e) => {
    if (!suggestionsEl.classList.contains("open") || !currentSuggestions.length) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchExact(input.value);
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
      else searchExact(input.value);
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      suggestionsEl.classList.remove("open");
    }
  });

  btnSearch.addEventListener("click", () => searchExact(input.value));
  btnRandom.addEventListener("click", randomWord);
  btnClear.addEventListener("click", () => {
    input.value = "";
    suggestionsEl.classList.remove("open");
    currentSuggestions = [];
    showEmpty();
    setStatus("");
    input.focus();
  });

  document.querySelectorAll(".samples button[data-word]").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.word;
      searchExact(btn.dataset.word);
    });
  });

  // Deep-link support: ?q=किरण
  const params = new URLSearchParams(location.search);
  const initial = params.get("q") || params.get("word");
  if (initial) {
    input.value = initial;
    searchExact(initial);
  } else {
    // Preload in background so first search is fast
    loadDictionary().catch(() => {});
  }
})();
