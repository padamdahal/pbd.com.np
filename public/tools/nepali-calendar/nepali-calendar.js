/*!
 * nepali-calendar.js 2.1.0
 * Bikram Sambat (BS) month calendar for any HTML page, no dependencies.
 *
 *  - Top bar: today's date, language toggle, Today button
 *  - Month view with month/year pickers and previous/next buttons
 *  - Every day carries its ISO (Gregorian) date as yyyy-mm-dd
 *  - Click a day (or press Enter on it) to copy its ISO date to the clipboard
 *  - Drag any day onto any <input> / <textarea> on the page to set its value to that ISO date
 *
 * Calendar data covers BS 2000-2090 (AD 1943-04-14 to 2034-04-13).
 * BS 2000-2083 matched across two independent sources. BS 2084+ is flagged "provisional"
 * (the sources disagree); override with NepaliCalendar.setMonthLengths(year, [12 lengths]).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NepaliCalendar = api;
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var doc = root.document;
  var SCRIPT = doc && doc.currentScript;

  /* ------------------------------------------------------------------ data */

  var START = 2000;                        // first BS year in the table
  var VERIFIED = 2083;                     // last BS year confirmed by two sources
  var ANCHOR = Date.UTC(1943, 3, 14);      // BS 2000-01-01 === AD 1943-04-14
  var DAY = 864e5;
  // Days in each BS month (Baisakh..Chaitra), one row per year starting at 2000.
  // 2000-2083: identical in two independent sources. 2084-2090: sources disagree, treat as provisional.
  var DATA = [
    [30,32,31,32,31,30,30,30,29,30,29,31], // 2000  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2001  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2002  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2003  366 days
    [30,32,31,32,31,30,30,30,29,30,29,31], // 2004  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2005  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2006  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2007  366 days
    [31,31,31,32,31,31,29,30,30,29,29,31], // 2008  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2009  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2010  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2011  366 days
    [31,31,31,32,31,31,29,30,30,29,30,30], // 2012  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2013  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2014  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2015  366 days
    [31,31,31,32,31,31,29,30,30,29,30,30], // 2016  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2017  365 days
    [31,32,31,32,31,30,30,29,30,29,30,30], // 2018  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2019  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2020  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2021  365 days
    [31,32,31,32,31,30,30,30,29,29,30,30], // 2022  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2023  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2024  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2025  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2026  366 days
    [30,32,31,32,31,30,30,30,29,30,29,31], // 2027  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2028  365 days
    [31,31,32,31,32,30,30,29,30,29,30,30], // 2029  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2030  366 days
    [30,32,31,32,31,30,30,30,29,30,29,31], // 2031  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2032  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2033  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2034  366 days
    [30,32,31,32,31,31,29,30,30,29,29,31], // 2035  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2036  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2037  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2038  366 days
    [31,31,31,32,31,31,29,30,30,29,30,30], // 2039  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2040  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2041  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2042  366 days
    [31,31,31,32,31,31,29,30,30,29,30,30], // 2043  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2044  365 days
    [31,32,31,32,31,30,30,29,30,29,30,30], // 2045  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2046  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2047  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2048  365 days
    [31,32,31,32,31,30,30,30,29,29,30,30], // 2049  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2050  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2051  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2052  365 days
    [31,32,31,32,31,30,30,30,29,29,30,30], // 2053  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2054  366 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2055  365 days
    [31,31,32,31,32,30,30,29,30,29,30,30], // 2056  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2057  366 days
    [30,32,31,32,31,30,30,30,29,30,29,31], // 2058  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2059  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2060  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2061  366 days
    [30,32,31,32,31,31,29,30,29,30,29,31], // 2062  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2063  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2064  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2065  366 days
    [31,31,31,32,31,31,29,30,30,29,29,31], // 2066  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2067  365 days
    [31,31,32,32,31,30,30,29,30,29,30,30], // 2068  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2069  366 days
    [31,31,31,32,31,31,29,30,30,29,30,30], // 2070  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2071  365 days
    [31,32,31,32,31,30,30,29,30,29,30,30], // 2072  365 days
    [31,32,31,32,31,30,30,30,29,29,30,31], // 2073  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2074  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2075  365 days
    [31,32,31,32,31,30,30,30,29,29,30,30], // 2076  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2077  366 days
    [31,31,31,32,31,31,30,29,30,29,30,30], // 2078  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2079  365 days
    [31,32,31,32,31,30,30,30,29,29,30,30], // 2080  365 days
    [31,32,31,32,31,30,30,30,29,30,29,31], // 2081  366 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2082  365 days
    [31,31,32,31,31,31,30,29,30,29,30,30], // 2083  365 days
    [31,31,32,31,31,30,30,30,29,30,30,30], // 2084  365 days  PROVISIONAL
    [31,32,31,32,30,31,30,30,29,30,30,30], // 2085  366 days  PROVISIONAL
    [30,32,31,32,31,30,30,30,29,30,30,30], // 2086  365 days  PROVISIONAL
    [31,31,32,31,31,31,30,30,29,30,30,30], // 2087  366 days  PROVISIONAL
    [30,31,32,32,30,31,30,30,29,30,30,30], // 2088  365 days  PROVISIONAL
    [30,32,31,32,31,30,30,30,29,30,30,30], // 2089  365 days  PROVISIONAL
    [30,32,31,32,31,30,30,30,29,30,30,30], // 2090  365 days  PROVISIONAL
  ];

  var Y = [];                              // per year: {m:[12], cum:[13], start, total, verified}
  var TOTAL = 0;
  var MAX_YEAR;

  function build() {
    var off = 0;
    for (var i = 0; i < Y.length; i++) {
      var cum = [0], t = 0;
      for (var k = 0; k < 12; k++) { t += Y[i].m[k]; cum.push(t); }
      Y[i].cum = cum; Y[i].total = t; Y[i].start = off; off += t;
    }
    TOTAL = off;
    MAX_YEAR = START + Y.length - 1;
  }
  (function () {
    for (var i = 0; i < DATA.length; i++) Y.push({ m: DATA[i].slice(), verified: START + i <= VERIFIED });
    build();
  }());

  /* ------------------------------------------------------------ conversion */

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function toISO(ms) {
    var d = new Date(ms);
    return pad(d.getUTCFullYear(), 4) + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2);
  }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3]), d = new Date(ms);
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return ms;
  }
  function monthLength(y, m) { var r = Y[y - START]; return r && m >= 1 && m <= 12 ? r.m[m - 1] : 0; }
  function valid(y, m, d) { return d >= 1 && d <= monthLength(y, m); }
  function offsetOf(y, m, d) { var r = Y[y - START]; return r.start + r.cum[m - 1] + d - 1; }
  function bsToISO(y, m, d) { return valid(y, m, d) ? toISO(ANCHOR + offsetOf(y, m, d) * DAY) : null; }
  function offToBS(off) {
    if (off < 0 || off >= TOTAL) return null;
    var lo = 0, hi = Y.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (Y[mid].start <= off) lo = mid; else hi = mid - 1; }
    var r = Y[lo], rem = off - r.start, m = 0;
    while (rem >= r.m[m]) { rem -= r.m[m]; m++; }
    return { year: START + lo, month: m + 1, day: rem + 1 };
  }
  function isoToBS(iso) {
    var ms = parseISO(iso);
    return ms === null ? null : offToBS(Math.round((ms - ANCHOR) / DAY));
  }
  function weekday(y, m, d) { return new Date(ANCHOR + offsetOf(y, m, d) * DAY).getUTCDay(); } // 0 = Sunday

  function todayISO(tz) {
    if (tz && tz !== 'local') {
      try {
        var o = {};
        new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
          .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
        return o.year + '-' + o.month + '-' + o.day;
      } catch (e) { /* fall through to local */ }
    }
    var n = new Date();
    return pad(n.getFullYear(), 4) + '-' + pad(n.getMonth() + 1, 2) + '-' + pad(n.getDate(), 2);
  }

  function setMonthLengths(year, lengths) {
    if (!Y[year - START]) throw new Error('Year out of range: ' + year);
    if (!lengths || lengths.length !== 12) throw new Error('Expected 12 month lengths');
    for (var i = 0; i < 12; i++) if (!(lengths[i] >= 29 && lengths[i] <= 32)) throw new Error('Month lengths must be 29-32');
    Y[year - START].m = lengths.slice();
    Y[year - START].verified = true;
    build();
  }

  /* ----------------------------------------------------------------- text */

  var ND = '०१२३४५६७८९';
  function num(n, nep) { n = String(n); return nep ? n.replace(/\d/g, function (c) { return ND.charAt(c); }) : n; }
  var AD_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var T = {
    ne: {
      months: ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'],
      wd: ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'],
      wdS: ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिहि', 'शुक्र', 'शनि'],
      today: 'आज', prevM: 'अघिल्लो महिना', nextM: 'अर्को महिना', prevY: 'अघिल्लो वर्ष', nextY: 'अर्को वर्ष',
      month: 'महिना', year: 'वर्ष', lang: 'EN', langTitle: 'Switch to English',
      copied: 'कपी गरियो', copyFail: 'कपी गर्न सकिएन',
      warn: function (n) { return num(VERIFIED, n) + ' पछिका मितिहरू पुष्टि भएका छैनन्'; }
    },
    en: {
      months: ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
      wd: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      wdS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      today: 'Today', prevM: 'Previous month', nextM: 'Next month', prevY: 'Previous year', nextY: 'Next year',
      month: 'Month', year: 'Year', lang: 'ने', langTitle: 'नेपालीमा हेर्नुहोस्',
      copied: 'Copied', copyFail: 'Could not copy',
      warn: function () { return 'BS dates after ' + VERIFIED + ' are unconfirmed'; }
    }
  };

  /* -------------------------------------------------- page-wide drag & drop */

  var config = { allowReadonly: true };    // also fill readonly inputs (common for date pickers)
  var drag = null;                         // {iso, inst} while one of our days is being dragged
  var hot = null, hotSaved = null;         // input currently highlighted as drop target
  var installed = false;
  var FILLABLE = { text: 1, search: 1, tel: 1, url: 1, date: 1 };

  function isFillable(el) {
    if (!el || el.nodeType !== 1 || el.disabled) return false;
    if (el.hasAttribute('data-nepali-calendar-ignore')) return false;
    if (el.readOnly && !config.allowReadonly) return false;
    if (el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && !!FILLABLE[(el.type || 'text').toLowerCase()];
  }
  function pathTarget(e) {
    var p = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < p.length; i++) if (isFillable(p[i])) return p[i];
    return null;
  }
  function setValue(el, v) {
    var proto = el.tagName === 'TEXTAREA' ? root.HTMLTextAreaElement.prototype : root.HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;          // native setter keeps React & co. in sync
    el.dispatchEvent(new root.Event('input', { bubbles: true }));
    el.dispatchEvent(new root.Event('change', { bubbles: true }));
  }
  function mark(el) {
    if (hot === el) return;
    unmark();
    hot = el;
    hotSaved = [el.style.outline, el.style.outlineOffset];
    el.style.outline = '2px solid #003893';
    el.style.outlineOffset = '2px';
  }
  function unmark() {
    if (!hot) return;
    hot.style.outline = hotSaved[0];
    hot.style.outlineOffset = hotSaved[1];
    hot = null;
  }
  function onOver(e) {
    if (!drag) return;
    var el = pathTarget(e);
    if (el) {
      e.preventDefault();                                          // announce "drop allowed here"
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      mark(el);
    } else unmark();
  }
  function onDrop(e) {
    if (!drag) return;
    var el = pathTarget(e), d = drag;
    unmark();
    if (!el) return;
    e.preventDefault();                                            // stop the browser inserting the text itself
    setValue(el, d.iso);
    d.inst.fire('drop', { iso: d.iso, bs: isoToBS(d.iso), input: el });
    drag = null;
  }
  function onEnd() { unmark(); drag = null; }

  function install() {
    if (installed || !doc) return;
    installed = true;
    doc.addEventListener('dragenter', onOver, true);
    doc.addEventListener('dragover', onOver, true);
    doc.addEventListener('drop', onDrop, true);
    doc.addEventListener('dragend', onEnd, true);
  }
  function dragChip(e, iso) {
    if (!e.dataTransfer || !e.dataTransfer.setDragImage) return;
    var c = doc.createElement('div');
    c.textContent = iso;
    c.style.cssText = 'position:fixed;top:-100px;left:-100px;padding:6px 10px;border-radius:6px;background:#003893;' +
      'color:#fff;font:600 14px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums';
    doc.body.appendChild(c);
    try { e.dataTransfer.setDragImage(c, 12, 12); } catch (err) { /* ignore */ }
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 0);
  }

  function legacyCopy(text) {                                      // for http:// pages and older browsers
    var ta = doc.createElement('textarea'), ok = false;
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    doc.body.appendChild(ta); ta.select();
    try { ok = !!doc.execCommand('copy'); } catch (e) { /* ignore */ }
    doc.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {                                        // -> Promise<boolean>
    var nav = root.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* ------------------------------------------------------------------ view */

  var ICON = function (d) {
    return '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="' + d +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  var I_PREV = ICON('M10 3 5 8l5 5'), I_NEXT = ICON('M6 3l5 5-5 5');

  var CSS = '' +
    ':host{display:block;width:100%;max-width:24rem;' +
    '--ink:var(--nc-ink,#1b2540);--muted:var(--nc-muted,#667089);--line:var(--nc-line,#dfe3ee);' +
    '--bg:var(--nc-bg,#fff);--accent:var(--nc-accent,#003893);--weekend:var(--nc-weekend,#c8102e);' +
    '--hover:var(--nc-hover,#eef2fb);--on-accent:#fff;' +
    '--font:var(--nc-font,"Noto Sans Devanagari","Mukta","Segoe UI",system-ui,-apple-system,Roboto,sans-serif);' +
    'font-family:var(--font);color:var(--ink)}' +
    ':host([data-theme="dark"]){--ink:var(--nc-ink,#e6eaf7);--muted:var(--nc-muted,#9aa3bd);--line:var(--nc-line,#2c3552);' +
    '--bg:var(--nc-bg,#141a2e);--accent:var(--nc-accent,#6f9bff);--weekend:var(--nc-weekend,#ff7a8c);--hover:var(--nc-hover,#1f2845);--on-accent:#0d1430}' +
    '@media (prefers-color-scheme:dark){:host([data-theme="auto"]){--ink:var(--nc-ink,#e6eaf7);--muted:var(--nc-muted,#9aa3bd);' +
    '--line:var(--nc-line,#2c3552);--bg:var(--nc-bg,#141a2e);--accent:var(--nc-accent,#6f9bff);--weekend:var(--nc-weekend,#ff7a8c);' +
    '--hover:var(--nc-hover,#1f2845);--on-accent:#0d1430}}' +
    '*{box-sizing:border-box}' +
    '.cal{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:.625rem}' +
    '.top{display:flex;align-items:center;gap:.4rem;padding:0 .125rem .55rem;margin-bottom:.45rem;border-bottom:1px solid var(--line)}' +
    '.read{flex:1;min-width:0;display:flex;flex-direction:column}' +
    '.r1{font-size:.8rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.r2{font-size:1rem;font-weight:700;letter-spacing:.02em;font-variant-numeric:tabular-nums}' +
    '.btn{font:inherit;font-size:.8rem;font-weight:600;border-radius:8px;padding:.4rem .7rem;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--ink)}' +
    '.btn:hover{background:var(--hover)}' +
    '.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}.btn.primary:hover{filter:brightness(1.1)}' +
    '.nav{display:flex;align-items:center;gap:.5rem}' +
    '.grp{display:flex;align-items:center;gap:.1rem;min-width:0}.grp.m{flex:1.3 1 0}.grp.y{flex:1 1 0}' +
    '.ico{flex:none;width:1.65rem;height:1.85rem;display:grid;place-items:center;border:0;background:transparent;color:var(--ink);border-radius:8px;cursor:pointer;padding:0}' +
    '.ico:hover:not(:disabled){background:var(--hover)}.ico:disabled{opacity:.3;cursor:default}' +
    '.pick{flex:1 1 0;min-width:0;font:inherit;font-weight:650;font-size:.95rem;color:var(--ink);background:transparent;border:1px solid transparent;' +
    'border-radius:8px;padding:.3rem .2rem;cursor:pointer;text-align:center;text-align-last:center;' +
    '-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:none}' +      /* no arrow; still opens on click */
    '.pick:hover{background:var(--hover)}.pick option{background:var(--bg);color:var(--ink)}' +
    'button:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}' +
    '.wd,.week{display:grid;grid-template-columns:repeat(7,1fr)}' +
    '.wd span{text-align:center;font-size:.72rem;font-weight:600;color:var(--muted);padding:.55rem 0 .3rem}' +
    '.wd span.sat{color:var(--weekend)}' +
    '.grid{display:grid;gap:2px}' +
    '.day,.blank{position:relative;min-height:2.6rem;aspect-ratio:1/.92}' +
    '.day{display:grid;place-items:center;border-radius:10px;cursor:grab;user-select:none;-webkit-user-select:none;outline:none}' +
    '.day:active{cursor:grabbing}' +
    '.bs{font-size:1.02rem;font-weight:600;font-variant-numeric:tabular-nums;transform:translateY(-.1rem)}' +
    '.ad{position:absolute;right:.28rem;bottom:.2rem;font-size:.6rem;line-height:1;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.day.sat .bs{color:var(--weekend)}' +
    '.day:hover{background:var(--hover)}' +
    '.day.today{background:var(--accent)}.day.today .bs{color:var(--on-accent)}.day.today .ad{color:var(--on-accent);opacity:.8}' +
    '.day:focus-visible{box-shadow:inset 0 0 0 2px var(--accent)}' +
    '.day.dragging{opacity:.45}' +
    '.day.copied .bs{color:var(--accent);transform:none}.day.today.copied .bs{color:var(--on-accent)}' +
    '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '.note{margin:.45rem .125rem 0;font-size:.72rem;color:var(--weekend)}.note:empty{display:none}';

  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k) && b[k] !== undefined) a[k] = b[k]; return a; }

  function Calendar(container, opts) {
    var o = this.o = assign({
      lang: 'ne', digits: null, theme: 'light', timeZone: 'Asia/Kathmandu', today: null,
      showAD: true, langToggle: true, onDrop: null, onCopy: null, onChange: null
    }, opts || {});
    this.lang = o.lang === 'en' ? 'en' : 'ne';
    this.focusIso = null;

    this.host = doc.createElement('div');
    this.host.className = 'nepali-calendar';
    this.host.setAttribute('data-theme', o.theme);
    container.appendChild(this.host);
    var sr = this.root = this.host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<style>' + CSS + '</style><div class="cal">' +
      '<div class="top"><div class="read" aria-live="off"><span class="r1"></span><span class="r2"></span></div>' +
      '<button type="button" class="btn" data-act="lang"></button>' +
      '<button type="button" class="btn primary" data-act="today"></button></div>' +
      '<div class="nav">' +
      '<div class="grp m"><button type="button" class="ico" data-act="pm">' + I_PREV + '</button>' +
      '<select class="pick" data-role="month"></select>' +
      '<button type="button" class="ico" data-act="nm">' + I_NEXT + '</button></div>' +
      '<div class="grp y"><button type="button" class="ico" data-act="py">' + I_PREV + '</button>' +
      '<select class="pick" data-role="year"></select>' +
      '<button type="button" class="ico" data-act="ny">' + I_NEXT + '</button></div></div>' +
      '<div class="wd" role="row"></div><div class="grid" role="grid"></div><div class="note" role="status"></div><div class="sr" role="status" aria-live="polite"></div></div>';
    var q = function (s) { return sr.querySelector(s); };
    this.$mon = q('[data-role=month]'); this.$yr = q('[data-role=year]');
    this.$wd = q('.wd'); this.$grid = q('.grid'); this.$note = q('.note'); this.$sr = q('.sr');
    this.$r1 = q('.r1'); this.$r2 = q('.r2'); this.$lang = q('[data-act=lang]');
    this.$lang.style.display = o.langToggle ? '' : 'none';

    var self = this;
    sr.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (b) return self.act(b.getAttribute('data-act'));
      var d = e.target.closest && e.target.closest('.day');
      if (d) self.copy(d.getAttribute('data-iso'), d);
    });
    this.$mon.addEventListener('change', function () { self.goTo(self.year, +self.$mon.value); });
    this.$yr.addEventListener('change', function () { self.goTo(+self.$yr.value, self.month); });
    this.$grid.addEventListener('keydown', function (e) { self.key(e); });
    this.$grid.addEventListener('focusin', function (e) {
      var d = e.target.closest && e.target.closest('.day');
      if (d) self.focusIso = d.getAttribute('data-iso');
    });
    this.$grid.addEventListener('dragstart', function (e) {
      var d = e.target.closest && e.target.closest('.day');
      if (!d) return;
      var iso = d.getAttribute('data-iso');
      drag = { iso: iso, inst: self };
      d.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', iso);
        e.dataTransfer.setData('application/x-nepali-date', iso);
      }
      dragChip(e, iso);
    });
    this.$grid.addEventListener('dragend', function () {
      var el = self.$grid.querySelector('.dragging');
      if (el) el.classList.remove('dragging');
    });

    install();
    this.applyLang();
    var bs = isoToBS(this.todayISO()) || { year: START, month: 1 };
    this.year = bs.year; this.month = bs.month;
    this.render();
  }

  var P = Calendar.prototype;

  P.todayISO = function () { return this.o.today || todayISO(this.o.timeZone); };
  P.nep = function () { return this.o.digits ? this.o.digits === 'ne' : this.lang === 'ne'; };
  P.num = function (n) { return num(n, this.nep()); };

  P.applyLang = function () {
    var t = T[this.lang], s = this.root, self = this;
    this.host.setAttribute('lang', this.lang);
    var set = function (act, text) { var b = s.querySelector('[data-act=' + act + ']'); b.setAttribute('aria-label', text); b.title = text; };
    set('py', t.prevY); set('pm', t.prevM); set('nm', t.nextM); set('ny', t.nextY);
    this.$mon.setAttribute('aria-label', t.month); this.$yr.setAttribute('aria-label', t.year);
    this.$lang.textContent = t.lang; this.$lang.title = t.langTitle; this.$lang.setAttribute('aria-label', t.langTitle);
    s.querySelector('[data-act=today]').textContent = t.today;
    this.$wd.innerHTML = '';
    t.wdS.forEach(function (w, i) {
      var sp = doc.createElement('span');
      sp.setAttribute('role', 'columnheader'); sp.setAttribute('aria-label', t.wd[i]);
      sp.textContent = w; if (i === 6) sp.className = 'sat';
      self.$wd.appendChild(sp);
    });
  };

  P.render = function (focusIso) {
    var t = T[this.lang], y = this.year, m = this.month, i;
    var mo = '', yo = '';
    for (i = 0; i < 12; i++) mo += '<option value="' + (i + 1) + '"' + (i + 1 === m ? ' selected' : '') + '>' + t.months[i] + '</option>';
    for (i = START; i <= MAX_YEAR; i++) yo += '<option value="' + i + '"' + (i === y ? ' selected' : '') + '>' + this.num(i) + '</option>';
    this.$mon.innerHTML = mo; this.$yr.innerHTML = yo;

    var dis = function (act, on) { this.root.querySelector('[data-act=' + act + ']').disabled = on; }.bind(this);
    dis('py', y <= START); dis('pm', y === START && m === 1);
    dis('nm', y === MAX_YEAR && m === 12); dis('ny', y >= MAX_YEAR);

    var len = monthLength(y, m), first = weekday(y, m, 1), today = this.todayISO();
    var monthIsos = [], r, c, d;
    for (d = 1; d <= len; d++) monthIsos.push(bsToISO(y, m, d));
    var tab = focusIso || this.focusIso;
    if (monthIsos.indexOf(tab) < 0) tab = monthIsos.indexOf(today) >= 0 ? today : monthIsos[0];

    this.$grid.innerHTML = '';
    for (r = 0; r < 6; r++) {
      var row = doc.createElement('div');
      row.className = 'week'; row.setAttribute('role', 'row');
      for (c = 0; c < 7; c++) {
        d = r * 7 + c - first + 1;
        var cell = doc.createElement('div');
        if (d < 1 || d > len) { cell.className = 'blank'; cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-hidden', 'true'); }
        else {
          var iso = monthIsos[d - 1], ad = +iso.slice(8);
          cell.className = 'day' + (c === 6 ? ' sat' : '') + (iso === today ? ' today' : '');
          cell.setAttribute('role', 'gridcell'); cell.setAttribute('draggable', 'true');
          cell.setAttribute('data-iso', iso); cell.setAttribute('tabindex', iso === tab ? '0' : '-1');
          cell.setAttribute('aria-label', this.num(d) + ' ' + t.months[m - 1] + ' ' + this.num(y) + ', ' + iso);
          cell.title = iso;
          cell.innerHTML = '<span class="bs">' + this.num(d) + '</span>' +
            (this.o.showAD ? '<span class="ad">' + (ad === 1 || d === 1 ? AD_MON[+iso.slice(5, 7) - 1] + ' ' : '') + ad + '</span>' : '');
        }
        row.appendChild(cell);
      }
      this.$grid.appendChild(row);
    }
    this.$note.textContent = Y[y - START].verified ? '' : t.warn(this.nep());

    // top bar: today's date
    var tb = isoToBS(today);
    this.$r1.textContent = tb ? t.wd[weekday(tb.year, tb.month, tb.day)] + ', ' + this.num(tb.day) + ' ' + t.months[tb.month - 1] + ' ' + this.num(tb.year) : '';
    this.$r2.textContent = today;

    if (focusIso) { var f = this.$grid.querySelector('[data-iso="' + focusIso + '"]'); if (f) f.focus(); }
  };

  P.fire = function (type, detail) {
    this.host.dispatchEvent(new root.CustomEvent('nepali-calendar:' + type, { bubbles: true, composed: true, detail: detail }));
    var cb = this.o['on' + type.charAt(0).toUpperCase() + type.slice(1)];
    if (typeof cb === 'function') cb(detail);
  };

  P.goTo = function (y, m, focusIso) {
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    if (y < START || y > MAX_YEAR) return this;                // ignore moves past the data range
    var changed = y !== this.year || m !== this.month;
    this.year = y; this.month = m;
    this.render(focusIso);
    if (changed) this.fire('change', { year: y, month: m });
    return this;
  };
  P.next = function () { return this.goTo(this.year, this.month + 1); };
  P.prev = function () { return this.goTo(this.year, this.month - 1); };
  P.nextYear = function () { return this.goTo(this.year + 1, this.month); };
  P.prevYear = function () { return this.goTo(this.year - 1, this.month); };
  P.today = function () {
    var bs = isoToBS(this.todayISO());
    return bs ? this.goTo(bs.year, bs.month) : this;
  };

  // Copy a day's ISO date (yyyy-mm-dd) to the clipboard and flash a tick on the day.
  P.copy = function (iso, cell) {
    var self = this, t = T[this.lang];
    return copyText(iso).then(function (ok) {
      var b = cell && cell.isConnected && cell.querySelector('.bs');
      if (b) {
        var orig = b.textContent;
        cell.classList.add('copied'); b.textContent = ok ? '\u2713' : '!';
        setTimeout(function () { if (cell.isConnected) { cell.classList.remove('copied'); b.textContent = orig; } }, 900);
      }
      self.$sr.textContent = ok ? t.copied + ' ' + iso : t.copyFail;
      self.fire('copy', { iso: iso, bs: isoToBS(iso), ok: ok });
      return ok;
    });
  };

  P.act = function (a) {
    if (a === 'py') this.prevYear(); else if (a === 'pm') this.prev();
    else if (a === 'nm') this.next(); else if (a === 'ny') this.nextYear();
    else if (a === 'today') this.today();
    else if (a === 'lang') this.setLang(this.lang === 'ne' ? 'en' : 'ne');
  };

  P.key = function (e) {                                     // arrow-key navigation between days
    var d = e.target.closest && e.target.closest('.day');
    if (!d) return;
    var bs = isoToBS(d.getAttribute('data-iso')), delta = 0, k = e.key;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); this.copy(d.getAttribute('data-iso'), d); return; }
    if (k === 'ArrowLeft') delta = -1; else if (k === 'ArrowRight') delta = 1;
    else if (k === 'ArrowUp') delta = -7; else if (k === 'ArrowDown') delta = 7;
    else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      this.goTo(bs.year, bs.month, bsToISO(bs.year, bs.month, k === 'Home' ? 1 : monthLength(bs.year, bs.month)));
      return;
    } else if (k === 'PageUp' || k === 'PageDown') {
      e.preventDefault();
      var step = (k === 'PageUp' ? -1 : 1) * (e.shiftKey ? 12 : 1), ny = bs.year, nm = bs.month + step;
      while (nm < 1) { nm += 12; ny--; } while (nm > 12) { nm -= 12; ny++; }
      if (ny < START || ny > MAX_YEAR) return;
      this.goTo(ny, nm, bsToISO(ny, nm, Math.min(bs.day, monthLength(ny, nm))));
      return;
    } else return;
    e.preventDefault();
    var t = offToBS(offsetOf(bs.year, bs.month, bs.day) + delta);
    if (t) this.goTo(t.year, t.month, bsToISO(t.year, t.month, t.day));
  };

  P.setLang = function (l) { this.lang = l === 'en' ? 'en' : 'ne'; this.applyLang(); this.render(); return this; };
  P.destroy = function () { if (this.host.parentNode) this.host.parentNode.removeChild(this.host); };

  /* --------------------------------------------------------- public entry */

  function mount(target, opts) {
    var el = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!el) throw new Error('NepaliCalendar.mount: target not found');
    return new Calendar(el, opts);
  }

  function flag(v, def) { return v == null || v === '' ? def : v !== 'false'; }
  function autoMount() {                                     // every [data-nepali-calendar] element becomes a calendar
    if (!doc) return [];
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll('[data-nepali-calendar]'), function (el) {
      if (el.getAttribute('data-nc-mounted')) return;
      el.setAttribute('data-nc-mounted', '1');
      var ds = el.dataset;
      out.push(mount(el, {
        lang: ds.lang, digits: ds.digits, theme: ds.theme, timeZone: ds.timeZone, today: ds.today,
        showAD: flag(ds.showAd, undefined), langToggle: flag(ds.langToggle, undefined)
      }));
    });
    return out;
  }

  if (doc && SCRIPT && SCRIPT.src !== undefined && !SCRIPT.hasAttribute('data-manual')) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount); else autoMount();
  }

  return {
    version: '2.1.0',
    mount: mount,
    autoMount: autoMount,
    toAD: function (y, m, d) { return bsToISO(y, m, d); },
    toBS: function (iso) { return isoToBS(iso); },
    today: function (tz) { var i = todayISO(tz || 'Asia/Kathmandu'); return { iso: i, bs: isoToBS(i) }; },
    monthLength: monthLength,
    setMonthLengths: setMonthLengths,
    range: { minYear: START, get maxYear() { return MAX_YEAR; }, verifiedThrough: VERIFIED },
    config: config
  };
}));
