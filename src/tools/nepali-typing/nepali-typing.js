/* PBD Nepali Typing — Roman → Nepali Unicode engine + dual-pane live UI. No dependencies. */
(() => {
  "use strict";
  const H = "\u094D"; // halant
  const CONS = [
    ["ksh","\u0915\u094d\u0937"],["chh","\u091b"],["x","\u0915\u094d\u0937"],["gy","\u091c\u094d\u091e"],["ch","\u091a"],["kh","\u0916"],["gh","\u0918"],["ng","\u0919"],["jh","\u091d"],
    ["Th","\u0920"],["Dh","\u0922"],["th","\u0925"],["dh","\u0927"],["ph","\u092b"],["bh","\u092d"],["sh","\u0936"],["Sh","\u0937"],["Yn","\u091e"],
    ["k","\u0915"],["g","\u0917"],["c","\u091a"],["j","\u091c"],["T","\u091f"],["D","\u0921"],["N","\u0923"],["t","\u0924"],["d","\u0926"],["n","\u0928"],
    ["p","\u092a"],["f","\u092b"],["b","\u092c"],["m","\u092e"],["y","\u092f"],["r","\u0930"],["l","\u0932"],["w","\u0935"],["v","\u0935"],["s","\u0938"],
    ["h","\u0939"],["z","\u091c"],["q","\u0915"],
  ].sort((a, b) => b[0].length - a[0].length);
  const VOW = [
    ["Ri","\u090b","\u0943"],["aa","\u0906","\u093e"],["ai","\u0910","\u0948"],["au","\u0914","\u094c"],["ee","\u0908","\u0940"],["ii","\u0908","\u0940"],["oo","\u090a","\u0942"],["uu","\u090a","\u0942"],
    ["a","\u0905",""],["i","\u0907","\u093f"],["u","\u0909","\u0941"],["e","\u090f","\u0947"],["o","\u0913","\u094b"],["A","\u0906","\u093e"],["I","\u0908","\u0940"],["U","\u090a","\u0942"],
  ].sort((a, b) => b[0].length - a[0].length);
  const DIG = "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f";

  // Common words whose everyday spelling can't be guessed from plain phonetics.
  const DICT = {};
  ("nepal:\u0928\u0947\u092a\u093e\u0932 nepali:\u0928\u0947\u092a\u093e\u0932\u0940 namaste:\u0928\u092e\u0938\u094d\u0924\u0947 dhanyabad:\u0927\u0928\u094d\u092f\u0935\u093e\u0926 dhanyawad:\u0927\u0928\u094d\u092f\u0935\u093e\u0926 kathmandu:\u0915\u093e\u0920\u092e\u093e\u0921\u094c\u0902 pokhara:\u092a\u094b\u0916\u0930\u093e " +
   "lalitpur:\u0932\u0932\u093f\u0924\u092a\u0941\u0930 bhaktapur:\u092d\u0915\u094d\u0924\u092a\u0941\u0930 sarkar:\u0938\u0930\u0915\u093e\u0930 nagarik:\u0928\u093e\u0917\u0930\u093f\u0915 nagarikta:\u0928\u093e\u0917\u0930\u093f\u0915\u0924\u093e pariwar:\u092a\u0930\u093f\u0935\u093e\u0930 ghar:\u0918\u0930 kaam:\u0915\u093e\u092e " +
   "paisa:\u092a\u0948\u0938\u093e bank:\u092c\u0948\u0902\u0915 school:\u0938\u094d\u0915\u0941\u0932 college:\u0915\u0932\u0947\u091c hospital:\u0905\u0938\u094d\u092a\u0924\u093e\u0932 swasthya:\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f shiksha:\u0936\u093f\u0915\u094d\u0937\u093e mero:\u092e\u0947\u0930\u094b timro:\u0924\u093f\u092e\u094d\u0930\u094b " +
   "tapai:\u0924\u092a\u093e\u0908\u0902 tapaai:\u0924\u092a\u093e\u0908\u0902 hajur:\u0939\u091c\u0941\u0930 hami:\u0939\u093e\u092e\u0940 tara:\u0924\u0930 ho:\u0939\u094b hoina:\u0939\u094b\u0907\u0928 cha:\u091b chha:\u091b chhaina:\u091b\u0948\u0928 ke:\u0915\u0947 kina:\u0915\u093f\u0928 " +
   "kasari:\u0915\u0938\u0930\u0940 kahile:\u0915\u0939\u093f\u0932\u0947 kaha:\u0915\u0939\u093e\u0901 kun:\u0915\u0941\u0928 kati:\u0915\u0924\u093f shubhakamana:\u0936\u0941\u092d\u0915\u093e\u092e\u0928\u093e janmadin:\u091c\u0928\u094d\u092e\u0926\u093f\u0928 dashain:\u0926\u0936\u0948\u0902 tihar:\u0924\u093f\u0939\u093e\u0930 " +
   "holi:\u0939\u094b\u0932\u0940 bhai:\u092d\u093e\u0908 didi:\u0926\u093f\u0926\u0940 dai:\u0926\u093e\u0907 bahini:\u092c\u0939\u093f\u0928\u0940 aama:\u0906\u092e\u093e buwa:\u092c\u0941\u0935\u093e baba:\u092c\u093e\u092c\u093e sathi:\u0938\u093e\u0925\u0940 maya:\u092e\u093e\u092f\u093e prem:\u092a\u094d\u0930\u0947\u092e " +
   "khushi:\u0916\u0941\u0936\u0940 sabai:\u0938\u092c\u0948 dherai:\u0927\u0947\u0930\u0948 ali:\u0905\u0932\u093f ramro:\u0930\u093e\u092e\u094d\u0930\u094b naramro:\u0928\u0930\u093e\u092e\u094d\u0930\u094b garnu:\u0917\u0930\u094d\u0928\u0941 garnuhos:\u0917\u0930\u094d\u0928\u0941\u0939\u094b\u0938\u094d dinuhos:\u0926\u093f\u0928\u0941\u0939\u094b\u0938\u094d " +
   "huncha:\u0939\u0941\u0928\u094d\u091b hunuhuncha:\u0939\u0941\u0928\u0941\u0939\u0941\u0928\u094d\u091b thiyo:\u0925\u093f\u092f\u094b aaja:\u0906\u091c bholi:\u092d\u094b\u0932\u093f hijo:\u0939\u093f\u091c\u094b aba:\u0905\u092c pani:\u092a\u0928\u093f matra:\u092e\u093e\u0924\u094d\u0930 sanga:\u0938\u0901\u0917 " +
   "nepalma:\u0928\u0947\u092a\u093e\u0932\u092e\u093e ma:\u092e ra:\u0930").split(" ").forEach((p) => { const i = p.indexOf(":"); DICT[p.slice(0, i)] = p.slice(i + 1); });
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
        if (w.startsWith("MM", i)) { out += "\u0901"; i += 2; } else { out += w[i] === "M" ? "\u0902" : "\u0903"; i++; }
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
      if (o.danda) s = s.replace(/(?<![.\d])\.(?![.\d])(?=\s|$)/g, "\u0964");
      return s;
    }).join("");
  }

  if (typeof module !== "undefined") { module.exports = { convert, raw, convertText, suggest, variants }; }
  if (typeof document === "undefined") return;

  /* ---------------- Dual-pane UI ---------------- */
  const $ = (id) => document.getElementById(id);
  const roman = $("np-roman");
  const unicode = $("np-unicode");
  const bar = $("np-sugg");
  const opts = { digits: true, danda: true };
  let saveT;

  try { Object.assign(opts, JSON.parse(localStorage.getItem("pbd-np-opts") || "{}")); } catch (e) {}
  try { roman.value = localStorage.getItem("pbd-np-draft") || ""; } catch (e) {}

  const saveOpts = () => { try { localStorage.setItem("pbd-np-opts", JSON.stringify(opts)); } catch (e) {} };
  const saveDraft = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem("pbd-np-draft", roman.value); } catch (e) {}
    }, 400);
  };

  function curWord() {
    const m = roman.value.slice(0, roman.selectionStart).match(/[A-Za-z^]+$/);
    return m ? m[0] : "";
  }

  function update() {
    const src = roman.value;
    const out = convertText(src, opts);
    unicode.value = out;

    $("count-roman").textContent = src.length + " chars";
    $("count-unicode").textContent = out.length + " chars";
    $("np-count").textContent =
      (out.trim() ? out.trim().split(/\s+/).length : 0) + " words \u00b7 " + out.length + " characters";
    $("np-wa").href = "https://wa.me/?text=" + encodeURIComponent(out);

    // Suggestions for the word currently being typed
    bar.textContent = "";
    const w = curWord();
    if (!w) {
      bar.textContent = "Type in Roman letters \u2013 Unicode updates live on the right.";
      return;
    }
    suggest(w).forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sugg" + (i ? "" : " first");
      b.textContent = s;
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const p = roman.selectionStart;
        const st = p - w.length;
        // Replace current Roman word with the chosen Unicode.
        // Non-Roman characters pass through convertText unchanged, so the choice sticks.
        roman.value = roman.value.slice(0, st) + s + roman.value.slice(p);
        roman.selectionStart = roman.selectionEnd = st + s.length;
        roman.focus();
        saveDraft();
        update();
      });
      bar.appendChild(b);
    });
  }

  roman.addEventListener("input", () => { saveDraft(); update(); });
  roman.addEventListener("click", update);
  roman.addEventListener("keyup", update);

  [["opt-digits", "digits"], ["opt-danda", "danda"]].forEach(([id, k]) => {
    const el = $(id);
    el.checked = !!opts[k];
    el.addEventListener("change", () => {
      opts[k] = el.checked;
      saveOpts();
      update();
    });
  });

  const flash = (btn, txt) => {
    const o = btn.dataset.o || (btn.dataset.o = btn.textContent);
    btn.textContent = txt;
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = o; btn.classList.remove("copied"); }, 1400);
  };

  $("np-copy").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(unicode.value);
    } catch (err) {
      unicode.select();
      document.execCommand("copy");
    }
    flash(e.currentTarget, "Copied \u2713");
  });

  $("np-clear").addEventListener("click", () => {
    roman.value = "";
    saveDraft();
    update();
    roman.focus();
  });

  $("np-dl").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([unicode.value], { type: "text/plain;charset=utf-8" }));
    a.download = "nepali-text.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Year in footer
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // Initial render
  update();
})();
