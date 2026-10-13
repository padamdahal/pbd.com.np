(() => {
  "use strict";

  const BASE = "/tools/nepali-dictionary/";
  const CHUNK_SIZE = 4000;

  /** @type {{i:number, first:string, last:string, count:number}[]} */
  let index = [];
  /** @type {Map<number, Array<{w:string, d:Array<{g?:string, e?:string, s:string[]}>}>>} */
  const chunkCache = new Map();
  let loadingChunks = new Set();

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

  async function loadIndex() {
    if (index.length) return index;
    setStatus("Loading dictionary index…", "loading");
    const res = await fetch(BASE + "index.json");
    if (!res.ok) throw new Error("Could not load index");
    index = await res.json();
    const total = index.reduce((s, c) => s + c.count, 0);
    countEl.textContent = total.toLocaleString("en-NP") + " words";
    setStatus("");
    return index;
  }

  async function loadChunk(i) {
    if (chunkCache.has(i)) return chunkCache.get(i);
    if (loadingChunks.has(i)) {
      while (loadingChunks.has(i)) {
        await new Promise((r) => setTimeout(r, 50));
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
    let lo = 0, hi = index.length - 1;
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

  async function searchExact(word) {
    word = (word || "").trim();
    if (!word) {
      showEmpty();
      setStatus("");
      return;
    }
    await loadIndex();
    const chunkId = findChunkForWord(word);
    if (chunkId < 0) {
      showNotFound(word);
      return;
    }
    setStatus("Looking up…", "loading");
    hideEmpty();
    try {
      const chunk = await loadChunk(chunkId);
      let lo = 0, hi = chunk.length - 1;
      let found = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const cmp = chunk[mid].w.localeCompare(word);
        if (cmp === 0) {
          found = chunk[mid];
          break;
        }
        if (cmp < 0) lo = mid + 1;
        else hi = mid - 1;
      }
      if (!found) {
        found = chunk.find((e) => e.w === word) || null;
      }
      if (found) {
        renderEntry(found);
        setStatus("");
      } else {
        for (const nid of [chunkId - 1, chunkId + 1]) {
          if (nid < 0 || nid >= index.length) continue;
          const nchunk = await loadChunk(nid);
          const hit = nchunk.find((e) => e.w === word);
          if (hit) {
            renderEntry(hit);
            setStatus("");
            return;
          }
        }
        showNotFound(word);
      }
    } catch (err) {
      console.error(err);
      setStatus("Could not load dictionary data. Check your connection and try again.", "error");
      showEmpty();
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  async function getSuggestions(prefix) {
    prefix = (prefix || "").trim();
    if (prefix.length < 1) {
      currentSuggestions = [];
      renderSuggestions();
      return;
    }
    await loadIndex();
    const chunkIds = findChunksForPrefix(prefix);
    const matches = [];
    const limit = 12;
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
      } catch (_) {}
    }
    currentSuggestions = [...new Set(matches)].sort((a, b) => a.localeCompare(b)).slice(0, limit);
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
      const entry = chunk[Math.min(r, chunk.length - 1)];
      input.value = entry.w;
      renderEntry(entry);
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
    if (!q) {
      suggestionsEl.classList.remove("open");
      currentSuggestions = [];
      showEmpty();
      setStatus("");
      return;
    }
    debounceTimer = setTimeout(() => getSuggestions(q), 180);
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

  const params = new URLSearchParams(location.search);
  const initial = params.get("q") || params.get("word");
  if (initial) {
    input.value = initial;
    searchExact(initial);
  } else {
    loadIndex().catch(() => {});
  }
})();
