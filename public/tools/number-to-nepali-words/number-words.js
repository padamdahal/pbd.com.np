(function () {
  const NEP = ["शून्य","एक","दुई","तीन","चार","पाँच","छ","सात","आठ","नौ","दश","एघार","बाह्र","तेह्र","चौध","पन्ध्र","सोह्र","सत्र","अठार","उन्नाइस","बीस","एक्काइस","बाइस","तेइस","चौबीस","पच्चीस","छब्बीस","सत्ताइस","अठ्ठाइस","उनन्तीस","तीस","एकतीस","बत्तीस","तेत्तीस","चौँतीस","पैँतीस","छत्तीस","सैंतीस","अठतीस","उनन्चालीस","चालीस","एकचालीस","बयालीस","त्रिचालीस","चौवालीस","पैंतालीस","छयालीस","सत्ताचालीस","अठचालीस","उनन्चास","पचास","एकाउन्न","बाउन्न","त्रिपन्न","चौवन्न","पचपन्न","छपन्न","सन्ताउन्न","अन्ठाउन्न","उनन्साठी","साठी","एकसट्ठी","बयसट्ठी","त्रिसट्ठी","चौसट्ठी","पैंसट्ठी","छयसट्ठी","सतसट्ठी","अठसट्ठी","उनन्सत्तरी","सत्तरी","एकहत्तर","बहत्तर","त्रिहत्तर","चौहत्तर","पचहत्तर","छयहत्तर","सतहत्तर","अठहत्तर","उनासी","असी","एकासी","बयासी","त्रियासी","चौरासी","पचासी","छयासी","सतासी","अठासी","उनान्नब्बे","नब्बे","एकानब्बे","बयानब्बे","त्रियानब्बे","चौरानब्बे","पन्चानब्बे","छयानब्बे","सन्तानब्बे","अन्ठानब्बे","उनान्सय"];
  const UNITS = ["हजार","लाख","करोड","अर्ब","खर्ब","नील","पद्म","शंख"];
  const $ = (id) => document.getElementById(id);
  function below1000(n) {
    const h = Math.floor(n / 100), r = n % 100, out = [];
    if (h) out.push(NEP[h] + " सय");
    if (r) out.push(NEP[r]);
    return out.join(" ");
  }
  function toWords(big) {
    if (big === 0n) return NEP[0];
    const parts = [];
    const low = Number(big % 1000n);
    let rest = big / 1000n;
    if (low) parts.push(below1000(low));
    for (const unit of UNITS) {
      if (rest === 0n) break;
      const g = Number(rest % 100n);
      rest /= 100n;
      if (g) parts.unshift(NEP[g] + " " + unit);
    }
    return parts.join(" ");
  }
  function groupNepali(s) {
    if (s.length <= 3) return s;
    return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
  }
  const input = $("num"), hint = $("hint"), digitsEl = $("digits"), wordsEl = $("words"), copyBtn = $("copy"), out = $("out");
  function update() {
    hint.textContent = "";
    hint.classList.remove("error");
    out.hidden = true;
    let v = input.value.replace(/[०-९]/g, (d) => "०१२३४५६७८९".indexOf(d)).replace(/[,\s]/g, "");
    if (!v) return;
    const m = v.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!m) { hint.textContent = "Enter digits only, for example 250000 or 1,250.75"; hint.classList.add("error"); return; }
    const neg = m[1], whole = m[2], frac = m[3];
    const trimmed = whole.replace(/^0+(?=\d)/, "") || "0";
    if (trimmed.length > 19) { hint.textContent = "Too large. Use 19 digits or fewer."; hint.classList.add("error"); return; }
    if (frac && frac.length > 8) { hint.textContent = "Use 8 decimal digits or fewer."; hint.classList.add("error"); return; }
    let words = toWords(BigInt(trimmed));
    if (frac) words += " दशमलव " + [...frac].map((d) => NEP[+d]).join(" ");
    if (neg) words = "ऋण " + words;
    digitsEl.textContent = (neg ? "-" : "") + groupNepali(trimmed) + (frac ? "." + frac : "");
    wordsEl.textContent = words;
    out.hidden = false;
  }
  input.addEventListener("input", update);
  document.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.n; update(); input.focus(); }));
  $("clear").addEventListener("click", () => { input.value = ""; update(); input.focus(); });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(wordsEl.textContent);
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("copied");
    } catch (e) {
      copyBtn.textContent = "Select and copy";
    }
    setTimeout(() => { copyBtn.textContent = "Copy words"; copyBtn.classList.remove("copied"); }, 1400);
  });
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
