(() => {
  "use strict";

  const BS_START = 2000;
  const _BS_PACK = "243432221213334333212122334432212122343432221123243432221213334333212122334432212122343432221123333433122113334333212122334432212122343432221123333433122122334333212122334432212122343432221123333433122122334333212122343432212122343432221213333433212122334333212122343432221122343432221213333433212122334333212122343432221123243432221213334333212122334342212122343432221123243432221213334333212122334432212122343432221123243433122113334333212122334432212122343432221123333433122122334333212122334432212122343432221123333433122122334333212122343432212122343432221123333433212122334333212122343432221122343432221213333433212122334333212122343432221122343432221213334333212122334342212122343432221123243432221213334333212122334432212122343432221123243433121213334333212122334432212122343432221123333433122113334333212122334432212122343432221123333433122122334333212122343432212122343432221123333433212122334333212122343432221122343432221213333433212122334333212122343432221122343432221213334333212122334333221222234423221222243432221222243432221222";
  const BS_MONTHS = Array.from({ length: _BS_PACK.length / 12 }, (_, y) =>
    Array.from({ length: 12 }, (_, m) => 28 + (+_BS_PACK[y * 12 + m]))
  );
  const BS_END = BS_START + BS_MONTHS.length - 1;
  const EPOCH_AD = new Date(Date.UTC(1943, 3, 14));

  const BS_MONTH_NE = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुस","माघ","फागुन","चैत"];
  const BS_MONTH_EN = ["Baishakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
  const AD_MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WD_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const WD_NE = ["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];
  const DIG = "०१२३४५६७८९";
  const ne = (n) => String(n).replace(/[0-9]/g, (d) => DIG[+d]);

  function daysInBsMonth(y, m) {
    const i = y - BS_START;
    if (i < 0 || i >= BS_MONTHS.length) return 0;
    return BS_MONTHS[i][m - 1];
  }
  function isValidBs(y, m, d) {
    if (!y || y < BS_START || y > BS_END || m < 1 || m > 12 || d < 1) return false;
    return d <= daysInBsMonth(y, m);
  }
  function bsToAbsolute(y, m, d) {
    let days = 0;
    for (let yr = BS_START; yr < y; yr++) BS_MONTHS[yr - BS_START].forEach((n) => (days += n));
    const row = BS_MONTHS[y - BS_START];
    for (let i = 0; i < m - 1; i++) days += row[i];
    return days + d - 1;
  }
  function absoluteToBs(abs) {
    let remaining = abs;
    for (let yr = BS_START; yr <= BS_END; yr++) {
      const row = BS_MONTHS[yr - BS_START];
      const yearDays = row.reduce((a, b) => a + b, 0);
      if (remaining < yearDays) {
        for (let m = 0; m < 12; m++) {
          if (remaining < row[m]) return { y: yr, m: m + 1, d: remaining + 1 };
          remaining -= row[m];
        }
      }
      remaining -= yearDays;
    }
    return null;
  }
  function bsToAd(y, m, d) {
    if (!isValidBs(y, m, d)) return null;
    const ad = new Date(EPOCH_AD.getTime() + bsToAbsolute(y, m, d) * 86400000);
    return { y: ad.getUTCFullYear(), m: ad.getUTCMonth() + 1, d: ad.getUTCDate(), wd: ad.getUTCDay() };
  }
  function adToBs(y, m, d) {
    const ad = new Date(Date.UTC(y, m - 1, d));
    if (ad.getUTCFullYear() !== y || ad.getUTCMonth() !== m - 1 || ad.getUTCDate() !== d) return null;
    const abs = Math.round((ad.getTime() - EPOCH_AD.getTime()) / 86400000);
    if (abs < 0) return null;
    const bs = absoluteToBs(abs);
    return bs ? { ...bs, wd: ad.getUTCDay() } : null;
  }
  function daysInAdMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function adAbsDays(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - EPOCH_AD.getTime()) / 86400000); }

  // Calendar-aware "human" age: years/months/days, borrowing from the
  // previous month using that month's own length (handles BS's variable
  // month lengths and AD leap years correctly).
  function ageBreakdown(by, bm, bd, ty, tm, td, monthLen) {
    let years = ty - by, months = tm - bm, days = td - bd;
    if (days < 0) {
      const pm = tm === 1 ? 12 : tm - 1;
      const py = tm === 1 ? ty - 1 : ty;
      days += monthLen(py, pm);
      months--;
    }
    if (months < 0) { months += 12; years--; }
    return { years, months, days };
  }

  function fillSelect(el, items, selected) {
    el.innerHTML = "";
    for (const it of items) {
      const o = document.createElement("option");
      o.value = it.value; o.textContent = it.label;
      if (String(it.value) === String(selected)) o.selected = true;
      el.appendChild(o);
    }
  }

  if (typeof document === "undefined") {
    module.exports = { adToBs, bsToAd, isValidBs, daysInBsMonth, daysInAdMonth, adAbsDays, ageBreakdown, BS_START, BS_END };
    return;
  }

  const $ = (id) => document.getElementById(id);
  const hint = $("hint");

  fillSelect($("bs-m"), BS_MONTH_EN.map((n, i) => ({ value: i + 1, label: (i + 1) + " – " + n + " (" + BS_MONTH_NE[i] + ")" })), 1);
  fillSelect($("ad-m"), AD_MONTH_EN.map((n, i) => ({ value: i + 1, label: (i + 1) + " – " + n })), 1);

  function refreshBsDays(keep) {
    const y = +$("bs-y").value, m = +$("bs-m").value;
    const max = daysInBsMonth(y, m) || 32;
    const cur = keep != null ? keep : +$("bs-d").value || 1;
    fillSelect($("bs-d"), Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) })), Math.min(cur, max));
  }
  function refreshAdDays(keep) {
    const y = +$("ad-y").value || 2000, m = +$("ad-m").value || 1;
    const max = daysInAdMonth(y, m);
    const cur = keep != null ? keep : +$("ad-d").value || 1;
    fillSelect($("ad-d"), Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) })), Math.min(cur, max));
  }

  const [tY, tM, tD] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()).split("-").map(Number);
  const todayAd = { y: tY, m: tM, d: tD };
  const todayBs = adToBs(todayAd.y, todayAd.m, todayAd.d);
  const todayAbs = adAbsDays(todayAd.y, todayAd.m, todayAd.d);

  let lock = false, lastBs = null, lastAd = null;

  function setError(msg) {
    hint.textContent = msg || "";
    hint.classList.toggle("error", !!msg);
    $("result").hidden = !!msg;
    $("result").setAttribute("aria-hidden", String(!!msg));
  }

  function fromBs() {
    if (lock) return;
    const y = +$("bs-y").value, m = +$("bs-m").value, d = +$("bs-d").value;
    if (!y) { setError(""); $("result").hidden = true; return; }
    if (!isValidBs(y, m, d)) { setError("That BS date is out of range or invalid for this calendar."); return; }
    const ad = bsToAd(y, m, d);
    if (!ad) { setError("Could not convert this BS date."); return; }
    lock = true;
    $("ad-y").value = ad.y; $("ad-m").value = ad.m; refreshAdDays(ad.d); $("ad-d").value = ad.d;
    lock = false;
    lastBs = { y, m, d }; lastAd = { y: ad.y, m: ad.m, d: ad.d, wd: ad.wd };
    compute();
  }
  function fromAd() {
    if (lock) return;
    const y = +$("ad-y").value, m = +$("ad-m").value, d = +$("ad-d").value;
    if (!y) { setError(""); $("result").hidden = true; return; }
    const bs = adToBs(y, m, d);
    if (!bs) { setError("That AD date is out of range (supported AD 1943–2034)."); return; }
    lock = true;
    $("bs-y").value = bs.y; $("bs-m").value = bs.m; refreshBsDays(bs.d); $("bs-d").value = bs.d;
    lock = false;
    lastAd = { y, m, d, wd: bs.wd }; lastBs = { y: bs.y, m: bs.m, d: bs.d };
    compute();
  }

  function nextAnniversaryBs(bm, bd) {
    let y = todayBs.y, clampedD = Math.min(bd, daysInBsMonth(y, bm));
    let past = todayBs.m > bm || (todayBs.m === bm && todayBs.d > clampedD);
    let onDay = todayBs.m === bm && todayBs.d === clampedD;
    if (past) y++;
    clampedD = Math.min(bd, daysInBsMonth(y, bm));
    return { y, m: bm, d: clampedD, absDays: bsToAbsolute(y, bm, clampedD), today: onDay };
  }
  function nextAnniversaryAd(bm, bd) {
    let y = todayAd.y, clampedD = Math.min(bd, daysInAdMonth(y, bm));
    let past = todayAd.m > bm || (todayAd.m === bm && todayAd.d > clampedD);
    let onDay = todayAd.m === bm && todayAd.d === clampedD;
    if (past) y++;
    clampedD = Math.min(bd, daysInAdMonth(y, bm));
    return { y, m: bm, d: clampedD, absDays: adAbsDays(y, bm, clampedD), today: onDay };
  }

  const PLANETS = [
    ["Mercury", 0.2408467], ["Venus", 0.61519726], ["Mars", 1.8808158], ["Jupiter", 11.862615],
  ];

  function compute() {
    if (!lastBs || !lastAd) return;
    if (bsToAbsolute(lastBs.y, lastBs.m, lastBs.d) > todayAbs) {
      setError("That's in the future — pick a birth date up to today.");
      return;
    }
    setError("");

    const bsAge = ageBreakdown(lastBs.y, lastBs.m, lastBs.d, todayBs.y, todayBs.m, todayBs.d, daysInBsMonth);
    const adAge = ageBreakdown(lastAd.y, lastAd.m, lastAd.d, todayAd.y, todayAd.m, todayAd.d, daysInAdMonth);
    const totalDays = todayAbs - bsToAbsolute(lastBs.y, lastBs.m, lastBs.d);

    $("headline").innerHTML =
      `<strong>${bsAge.years}</strong> years, <strong>${bsAge.months}</strong> months, <strong>${bsAge.days}</strong> days <span class="muted">(BS)</span>`;
    $("headline-ad").innerHTML =
      `${adAge.years} years, ${adAge.months} months, ${adAge.days} days <span class="muted">(AD)</span>`;
    $("born-line").textContent =
      `Born ${BS_MONTH_NE[lastBs.m - 1]} ${ne(lastBs.d)}, ${ne(lastBs.y)} BS · ${AD_MONTH_EN[lastAd.m - 1]} ${lastAd.d}, ${lastAd.y} AD · a ${WD_EN[lastAd.wd]}`;

    const weeks = Math.floor(totalDays / 7);
    const months30 = Math.floor(totalDays / 30.4368);
    const hours = totalDays * 24, minutes = totalDays * 1440;
    $("stat-days").textContent = totalDays.toLocaleString();
    $("stat-weeks").textContent = weeks.toLocaleString();
    $("stat-months").textContent = months30.toLocaleString();
    $("stat-hours").textContent = hours.toLocaleString();
    $("stat-minutes").textContent = minutes.toLocaleString();
    $("stat-heartbeats").textContent = Math.round(minutes * 75).toLocaleString();
    $("stat-sleep").textContent = (totalDays / 3).toFixed(0).toLocaleString();

    const nb = nextAnniversaryBs(lastBs.m, lastBs.d);
    const na = nextAnniversaryAd(lastAd.m, lastAd.d);
    $("next-bs").textContent = nb.today
      ? "Today! 🎉"
      : `${BS_MONTH_NE[nb.m - 1]} ${ne(nb.d)}, ${ne(nb.y)} BS — in ${(nb.absDays - todayAbs).toLocaleString()} day${nb.absDays - todayAbs === 1 ? "" : "s"}`;
    $("next-ad").textContent = na.today
      ? "Today! 🎉"
      : `${AD_MONTH_EN[na.m - 1]} ${na.d}, ${na.y} — in ${(na.absDays - todayAbs).toLocaleString()} day${na.absDays - todayAbs === 1 ? "" : "s"}`;

    const earthYears = totalDays / 365.2425;
    const planetsHtml = PLANETS.map(([name, period]) => {
      const n = Math.floor(earthYears / period);
      return `<div class="planet"><strong>${n.toLocaleString()}</strong><span>birthday${n === 1 ? "" : "s"} on ${name}</span></div>`;
    }).join("");
    $("planets").innerHTML = planetsHtml;

    const milestones = [1000, 5000, 10000, 15000, 20000, 25000, 30000];
    const nextM = milestones.find((m) => m > totalDays);
    $("milestone").textContent = nextM
      ? `Day ${nextM.toLocaleString()} of your life is in ${(nextM - totalDays).toLocaleString()} days.`
      : "";

    $("result").hidden = false;
    $("result").setAttribute("aria-hidden", "false");
  }

  ["bs-y", "bs-m", "bs-d"].forEach((id) => {
    $(id).addEventListener("input", () => { if (id !== "bs-d") refreshBsDays(); fromBs(); });
    $(id).addEventListener("change", () => { if (id !== "bs-d") refreshBsDays(); fromBs(); });
  });
  ["ad-y", "ad-m", "ad-d"].forEach((id) => {
    $(id).addEventListener("input", () => { if (id !== "ad-d") refreshAdDays(); fromAd(); });
    $(id).addEventListener("change", () => { if (id !== "ad-d") refreshAdDays(); fromAd(); });
  });

  refreshBsDays(1);
  refreshAdDays(1);
  $("result").hidden = true;
})();
