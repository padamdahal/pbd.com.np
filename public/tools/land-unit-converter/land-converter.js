/**
 * Nepal Land Unit Converter
 * Standard factors:
 *   1 Ropani = 5476 sq ft = 16 Aana = 64 Paisa = 256 Daam
 *   1 Bigha  = 72900 sq ft = 20 Kattha = 400 Dhur
 * Uses international foot: 1 sq ft = 0.09290304 m²
 */
(function () {
  "use strict";

  // Exact base values in square feet
  const ROPANI_SQFT = 5476;
  const AANA_SQFT = ROPANI_SQFT / 16;      // 342.25
  const PAISA_SQFT = AANA_SQFT / 4;        // 85.5625
  const DAAM_SQFT = PAISA_SQFT / 4;        // 21.390625

  const BIGHA_SQFT = 72900;
  const KATTHA_SQFT = BIGHA_SQFT / 20;     // 3645
  const DHUR_SQFT = KATTHA_SQFT / 20;      // 182.25

  const SQFT_TO_SQM = 0.09290304;
  const ACRE_SQFT = 43560;
  const HECTARE_SQM = 10000;

  // DOM elements
  const ids = [
    "ropani", "aana", "paisa", "daam",
    "bigha", "kattha", "dhur",
    "sqft", "sqm", "acre", "hectare"
  ];
  const el = {};
  ids.forEach(id => { el[id] = document.getElementById(id); });

  const hillDisplay = document.getElementById("hill-display");
  const teraiDisplay = document.getElementById("terai-display");
  const btnClear = document.getElementById("btn-clear");
  const btnCopySqft = document.getElementById("btn-copy-sqft");
  const btnCopySqm = document.getElementById("btn-copy-sqm");

  let updating = false;

  function parse(val) {
    if (val === "" || val === null || val === undefined) return 0;
    const n = parseFloat(String(val).replace(/,/g, ""));
    return isFinite(n) && n >= 0 ? n : 0;
  }

  function fmt(n, decimals) {
    if (!isFinite(n) || n === 0) return "0";
    // Prefer clean integers when very close
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    const d = decimals != null ? decimals : (Math.abs(n) >= 100 ? 2 : 4);
    return n.toFixed(d).replace(/\.?0+$/, "");
  }

  function setValue(input, value, decimals) {
    if (!input) return;
    const str = fmt(value, decimals);
    if (document.activeElement === input) return; // don't overwrite while typing
    input.value = value === 0 ? "" : str;
  }

  // Convert any source to total square feet, then push to all fields
  function fromSqFt(totalSqFt) {
    if (updating) return;
    updating = true;

    // Hills breakdown (carry properly)
    let remaining = totalSqFt;
    const r = Math.floor(remaining / ROPANI_SQFT + 1e-12);
    remaining -= r * ROPANI_SQFT;
    const a = Math.floor(remaining / AANA_SQFT + 1e-12);
    remaining -= a * AANA_SQFT;
    const p = Math.floor(remaining / PAISA_SQFT + 1e-12);
    remaining -= p * PAISA_SQFT;
    const d = remaining / DAAM_SQFT;

    // For display we also keep the continuous values
    const totalRopani = totalSqFt / ROPANI_SQFT;
    const totalAana = totalSqFt / AANA_SQFT;
    const totalPaisa = totalSqFt / PAISA_SQFT;
    const totalDaam = totalSqFt / DAAM_SQFT;

    // Terai
    const totalBigha = totalSqFt / BIGHA_SQFT;
    const totalKattha = totalSqFt / KATTHA_SQFT;
    const totalDhur = totalSqFt / DHUR_SQFT;

    let remT = totalSqFt;
    const b = Math.floor(remT / BIGHA_SQFT + 1e-12);
    remT -= b * BIGHA_SQFT;
    const k = Math.floor(remT / KATTHA_SQFT + 1e-12);
    remT -= k * KATTHA_SQFT;
    const dh = remT / DHUR_SQFT;

    // Metric / Imperial
    const totalSqM = totalSqFt * SQFT_TO_SQM;
    const totalAcre = totalSqFt / ACRE_SQFT;
    const totalHa = totalSqM / HECTARE_SQM;

    // Update continuous inputs (keep the field the user is editing untouched)
    setValue(el.ropani, totalRopani, 6);
    setValue(el.aana, totalAana, 6);
    setValue(el.paisa, totalPaisa, 6);
    setValue(el.daam, totalDaam, 6);

    setValue(el.bigha, totalBigha, 6);
    setValue(el.kattha, totalKattha, 6);
    setValue(el.dhur, totalDhur, 6);

    setValue(el.sqft, totalSqFt, 4);
    setValue(el.sqm, totalSqM, 4);
    setValue(el.acre, totalAcre, 6);
    setValue(el.hectare, totalHa, 6);

    // Composite displays (integer carry style, like Lalpurja)
    const daamRounded = Math.round(d * 10000) / 10000;
    hillDisplay.textContent =
      r + "-" + a + "-" + p + "-" + (daamRounded % 1 === 0 ? daamRounded : daamRounded.toFixed(4).replace(/\.?0+$/, ""));

    const dhurRounded = Math.round(dh * 10000) / 10000;
    teraiDisplay.textContent =
      b + "-" + k + "-" + (dhurRounded % 1 === 0 ? dhurRounded : dhurRounded.toFixed(4).replace(/\.?0+$/, ""));

    updating = false;
  }

  // Handlers that convert the active field into total sq ft
  function onInput(source) {
    if (updating) return;
    let total = 0;

    switch (source) {
      case "ropani":
        total = parse(el.ropani.value) * ROPANI_SQFT;
        break;
      case "aana":
        total = parse(el.aana.value) * AANA_SQFT;
        break;
      case "paisa":
        total = parse(el.paisa.value) * PAISA_SQFT;
        break;
      case "daam":
        total = parse(el.daam.value) * DAAM_SQFT;
        break;
      case "bigha":
        total = parse(el.bigha.value) * BIGHA_SQFT;
        break;
      case "kattha":
        total = parse(el.kattha.value) * KATTHA_SQFT;
        break;
      case "dhur":
        total = parse(el.dhur.value) * DHUR_SQFT;
        break;
      case "sqft":
        total = parse(el.sqft.value);
        break;
      case "sqm":
        total = parse(el.sqm.value) / SQFT_TO_SQM;
        break;
      case "acre":
        total = parse(el.acre.value) * ACRE_SQFT;
        break;
      case "hectare":
        total = parse(el.hectare.value) * HECTARE_SQM / SQFT_TO_SQM;
        break;
      default:
        return;
    }
    fromSqFt(total);
  }

  // Attach listeners
  ids.forEach(id => {
    el[id].addEventListener("input", () => onInput(id));
    el[id].addEventListener("change", () => onInput(id));
  });

  // Clear
  btnClear.addEventListener("click", () => {
    updating = true;
    ids.forEach(id => { el[id].value = ""; });
    hillDisplay.textContent = "0-0-0-0";
    teraiDisplay.textContent = "0-0-0";
    updating = false;
    el.ropani.focus();
  });

  // Copy helpers
  function copyText(text, btn) {
    if (!text || text === "0") return;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 1500);
    }).catch(() => {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  btnCopySqft.addEventListener("click", () => {
    const v = el.sqft.value || "0";
    copyText(v, btnCopySqft);
  });
  btnCopySqm.addEventListener("click", () => {
    const v = el.sqm.value || "0";
    copyText(v, btnCopySqm);
  });

  // Year in footer
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // Optional: start with 1 Ropani as a useful default demo
  // el.ropani.value = "1";
  // onInput("ropani");
})();
