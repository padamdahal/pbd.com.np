/* PBD Nepali Typing — Roman → Nepali Unicode engine + in-place typing UI. No dependencies. */
(() => {
  "use strict";
  const H = "\u094D"; // halant
  const CONS = [
    ["ksh","क्ष"],["chh","छ"],["x","क्ष"],["gy","ज्ञ"],["ch","च"],["kh","ख"],["gh","घ"],["ng","ङ"],["jh","झ"],
    ["Th","ठ"],["Dh","ढ"],["th","थ"],["dh","ध"],["ph","फ"],["bh","भ"],["sh","श"],["Sh","ष"],["Yn","ञ"],
    ["k","क"],["g","ग"],["c","च"],["j","ज"],["T","ट"],["D","ड"],["N","ण"],["t","त"],["d","द"],["n","न"],
    ["p","प"],["f","फ"],["b","ब"],["m","म"],["y","य"],["r","र"],["l","ल"],["w","व"],["v","व"],["s","स"],
    ["h","ह"],["z","ज"],["q","क"],
  ].sort((a, b) => b[0].length - a[0].length);
  const VOW = [
    ["Ri","ऋ","ृ"],["aa","आ","ा"],["ai","ऐ","ै"],["au","औ","ौ"],["ee","ई","ी"],["ii","ई","ी"],["oo","ऊ","ू"],["uu","ऊ","ू"],
    ["a","अ",""],["i","इ","ि"],["u","उ","ु"],["e","ए","े"],["o","ओ","ो"],["A","आ","ा"],["I","ई","ी"],["U","ऊ","ू"],
  ].sort((a, b) => b[0].length - a[0].length);
  const DIG = "०१२३४५६७८९";

  // Common words whose everyday spelling can't be guessed from plain phonetics.
  const DICT = {};
  ("nepal:नेपाल nepali:नेपाली namaste:नमस्ते dhanyabad:धन्यवाद dhanyawad:धन्यवाद kathmandu:काठमाडौं pokhara:पोखरा " +
   "lalitpur:ललितपुर bhaktapur:भक्तपुर sarkar:सरकार nagarik:नागरिक nagarikta:नागरिकता pariwar:परिवार ghar:घर kaam:काम " +
   "paisa:पैसा bank:बैंक school:स्कुल college:कलेज hospital:अस्पताल swasthya:स्वास्थ्य shiksha:शिक्षा mero:मेरो timro:तिम्रो " +
   "tapai:तपाईं tapaai:तपाईं hajur:हजुर hami:हामी tara:तर ho:हो hoina:होइन cha:छ chha:छ chhaina:छैन ke:के kina:किन " +
   "kasari:कसरी kahile:कहिले kaha:कहाँ kun:कुन kati:कति shubhakamana:शुभकामना janmadin:जन्मदिन dashain:दशैं tihar:तिहार " +
   "holi:होली bhai:भाई didi:दिदी dai:दाइ bahini:बहिनी aama:आमा buwa:बुवा baba:बाबा sathi:साथी maya:माया prem:प्रेम " +
   "khushi:खुशी sabai:सबै dherai:धेरै ali:अलि ramro:राम्रो naramro:नराम्रो garnu:गर्नु garnuhos:गर्नुहोस् dinuhos:दिनुहोस् " +
   "huncha:हुन्छ hunuhuncha:हुनुहुन्छ thiyo:थियो aaja:आज bholi:भोलि hijo:हिजो aba:अब pani:पनि matra:मात्र sanga:सँग " +
   "nepalma:नेपालमा ma:म ra:र").split(" ").forEach((p) => { const i = p.indexOf(":"); DICT[p.slice(0, i)] = p.slice(i + 1); });
  const DKEYS = Object.keys(DICT);

  const at = (list, s, i) => {
    for (const e of list) if (s.startsWith(e[0], i)) return e;
    const c = s[i];
    if (c && c !== c.toLowerCase()) { // uppercase letter with no special meaning → treat as lowercase
      const lw = c.toLowerCase() + s.slice(i + 1);
      for (const e of list) if (lw.startsWith(e[0])) return e;
    }
    return null;
  };

  function raw(w) {
    let out = "", i = 0, pend = false; // pend: last unit is a consonant with no vowel yet
    while (i < w.length) {
      if (i > 0 && (w[i] === "M" || w[i] === "H")) { // anusvara / chandrabindu / visarga
        if (w.startsWith("MM", i)) { out += "ँ"; i += 2; } else { out += w[i] === "M" ? "ं" : "ः"; i++; }
        pend = false; continue;
      }
      const c = at(CONS, w, i);
      if (c) {
        out += (pend ? H : "") + c[1]; i += c[0].length; pend = true;
        const v = at(VOW, w, i);
        if (v) { out += v[2]; i += v[0].length; pend = false; }
        else if (w[i] === "^") { out += H; i++; pend = false; }
        continue;
      }
      const v = at(VOW, w, i);
      if (v) { out += v[1]; i += v[0].length; pend = false; continue; }
      out += w[i]; i++; pend = false;
    }
    return out;
  }

  function convert(w) {
    if (DICT[w]) return DICT[w];
    if (/^[A-Z][a-z]+$/.test(w) && DICT[w.toLowerCase()]) return DICT[w.toLowerCase()];
    return raw(w);
  }

  function variants(w) {
    const out = new Set(), base = convert(w);
    const add = (v) => { const r = convert(v); if (r !== base) out.add(r); };
    for (let i = 0; i < w.length && out.size < 8; i++) {
      const c = w[i], n = w[i + 1];
      if ("tdn".includes(c) && n !== "h" && n !== "g") add(w.slice(0, i) + c.toUpperCase() + w.slice(i + 1));
      else if ("TDN".includes(c)) add(w.slice(0, i) + c.toLowerCase() + w.slice(i + 1));
      if (c === "s" && n !== "h") add(w.slice(0, i) + "sh" + w.slice(i + 1));
      if (c === "a" && n !== "a" && w[i - 1] !== "a") add(w.slice(0, i) + "aa" + w.slice(i + 1));
      if (c === "i" && n !== "i") add(w.slice(0, i) + "ee" + w.slice(i + 1));
      if (c === "u" && n !== "u") add(w.slice(0, i) + "oo" + w.slice(i + 1));
    }
    return [...out];
  }

  function suggest(w) {
    const list = [convert(w)];
    const push = (x) => { if (x && !list.includes(x)) list.push(x); };
    if (!DICT[w]) push(raw(w));
    const lw = w.toLowerCase();
    DKEYS.filter((k) => k.length > lw.length && k.startsWith(lw)).slice(0, 4).forEach((k) => push(DICT[k]));
    variants(w).forEach(push);
    return list.slice(0, 8);
  }

  function convertText(t, o) {
    o = Object.assign({ digits: true, danda: true }, o);
    return t.split(/(\{[^}]*\})/).map((part) => {
      if (/^\{[^}]*\}$/.test(part)) return part.slice(1, -1); // {English} stays as typed
      let s = part.replace(/[A-Za-z^]+/g, convert);
      if (o.digits) s = s.replace(/[0-9]/g, (d) => DIG[+d]);
      if (o.danda) s = s.replace(/(?<![.\d])\.(?![.\d])(?=\s|$)/g, "।");
      return s;
    }).join("");
  }

  if (typeof module !== "undefined") { module.exports = { convert, raw, convertText, suggest, variants }; }
  if (typeof document === "undefined") return;

  /* ---------------- UI ---------------- */
  const $ = (id) => document.getElementById(id);
  const ta = $("np-text"), bar = $("np-sugg"), modeBtn = $("np-mode");
  const opts = { nep: true, digits: true, danda: true };
  try { Object.assign(opts, JSON.parse(localStorage.getItem("pbd-np-opts") || "{}")); } catch (e) {}
  try { ta.value = localStorage.getItem("pbd-np-draft") || ""; } catch (e) {}
  const WORD = /[A-Za-z^]/;
  let last = null, saveT;

  const saveOpts = () => { try { localStorage.setItem("pbd-np-opts", JSON.stringify(opts)); } catch (e) {} };
  const saveDraft = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem("pbd-np-draft", ta.value); } catch (e) {} }, 400); };

  function setMode(on) {
    opts.nep = on; saveOpts();
    modeBtn.setAttribute("aria-pressed", String(on));
    modeBtn.textContent = on ? "नेपाली ✓ (Ctrl+Space)" : "English (Ctrl+Space)";
    refresh();
  }

  function curWord() {
    const m = ta.value.slice(0, ta.selectionStart).match(/[A-Za-z^]+$/);
    return m ? m[0] : "";
  }

  function refresh() {
    const v = ta.value;
    $("np-count").textContent = (v.trim() ? v.trim().split(/\s+/).length : 0) + " words · " + v.length + " characters";
    $("np-wa").href = "https://wa.me/?text=" + encodeURIComponent(v);
    bar.textContent = "";
    const w = opts.nep ? curWord() : "";
    if (!w) { bar.textContent = opts.nep ? "Type in Roman letters, then press space — it turns into Nepali. Backspace right after to undo." : "English mode: typing is unchanged."; return; }
    suggest(w).forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sugg" + (i ? "" : " first"); b.textContent = s;
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const p = ta.selectionStart, st = p - w.length;
        ta.value = ta.value.slice(0, st) + s + ta.value.slice(p);
        ta.selectionStart = ta.selectionEnd = st + s.length; ta.focus(); last = null; saveDraft(); refresh();
      });
      bar.appendChild(b);
    });
  }

  ta.addEventListener("input", (e) => {
    last = null;
    if (opts.nep && /^insert(Text|LineBreak|Paragraph)$/.test(e.inputType)) {
      const pos = ta.selectionStart, v = ta.value, ch = v[pos - 1];
      if (ch !== undefined && !WORD.test(ch)) {
        let end = pos - 1, s = end;
        while (s > 0 && WORD.test(v[s - 1])) s--;
        const roman = v.slice(s, end), nep = roman ? convert(roman) : "";
        let b = ch;
        if (opts.digits && /[0-9]/.test(ch)) b = DIG[+ch];
        else if (opts.danda && ch === "." && !/[.\d]/.test(v[end - 1] || "") && (pos === v.length || /\s/.test(v[pos]))) b = "।";
        if (nep || b !== ch) {
          ta.value = v.slice(0, s) + nep + b + v.slice(pos);
          const c = s + nep.length + b.length;
          ta.selectionStart = ta.selectionEnd = c;
          if (roman) last = { s, roman, nep, b, c };
        }
      }
    }
    saveDraft(); refresh();
  });

  ta.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.code === "Space") { e.preventDefault(); setMode(!opts.nep); return; }
    if (e.key === "Backspace" && last && ta.selectionStart === ta.selectionEnd && ta.selectionStart === last.c &&
        ta.value.slice(last.s, last.c) === last.nep + last.b) { // undo conversion → back to Roman
      e.preventDefault();
      ta.value = ta.value.slice(0, last.s) + last.roman + ta.value.slice(last.c);
      ta.selectionStart = ta.selectionEnd = last.s + last.roman.length; last = null; saveDraft(); refresh();
    }
  });
  ["click", "keyup"].forEach((ev) => ta.addEventListener(ev, refresh));

  modeBtn.addEventListener("click", () => { setMode(!opts.nep); ta.focus(); });
  [["opt-digits", "digits"], ["opt-danda", "danda"]].forEach(([id, k]) => {
    const el = $(id); el.checked = !!opts[k];
    el.addEventListener("change", () => { opts[k] = el.checked; saveOpts(); });
  });

  const flash = (btn, txt) => { const o = btn.dataset.o || (btn.dataset.o = btn.textContent); btn.textContent = txt; setTimeout(() => (btn.textContent = o), 1400); };
  $("np-copy").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(ta.value); }
    catch (err) { ta.select(); document.execCommand("copy"); }
    flash(e.currentTarget, "Copied ✓");
  });
  $("np-convert").addEventListener("click", () => { ta.value = convertText(ta.value, opts); last = null; saveDraft(); refresh(); });
  $("np-clear").addEventListener("click", () => { ta.value = ""; last = null; saveDraft(); refresh(); ta.focus(); });
  $("np-dl").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ta.value], { type: "text/plain;charset=utf-8" }));
    a.download = "nepali-text.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  setMode(opts.nep);
})();
