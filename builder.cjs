/**
 * builder.cjs — injects static site chrome and catalog cards at build time.
 * Run:  node builder.cjs
 *
 * Single source of truth for:
 *   - Logo mark + site title (PBD / Powered By Digital)
 *   - Top nav links
 *   - Footer pills + copyright / legal
 *   - Tools / Widgets / Guides catalog cards (injected into the respective index pages)
 *
 * Source HTML pages should keep only structural placeholders:
 *   <header class="site-header"><div class="bar"></div></header>
 *   <main id="tools|widgets|guides">…</main>   (catalog pages only)
 *   <footer class="site-footer"></footer>
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");

/** Canonical brand — keep identical on every page */
const BRAND = `<a class="brand" href="/" aria-label="Powered By Digital (PBD) — Home"><span class="logo-mark" aria-hidden="true">P</span><span class="brand-text"><span class="brand-name">PBD</span><span class="brand-full">Powered By Digital</span></span></a>`;

const NAV_TOGGLE = `<button type="button" id="nav-toggle" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>`;

const HEADER_NAV = `<nav id="menu" class="site-nav" aria-label="Main navigation" role="navigation"><a href="/">Home</a><a href="/tools/">Tools</a><a href="/widgets/">Widgets</a><a href="/guides/">Guides</a><a href="/about/">About</a></nav>`;

/** Full header bar contents (brand + toggle + nav) */
const HEADER_BAR_INNER = `${BRAND}
      ${NAV_TOGGLE}
      ${HEADER_NAV}`;

const HEADER_BLOCK = `<header class="site-header">
    <div class="bar">
      ${HEADER_BAR_INNER}
    </div>
  </header>`;

const FOOTER_NAV = `<nav id="footer-menu" class="footer-pills" aria-label="Footer"><a href="/tools/nepali-typing/">Nepali Typing</a><a href="/tools/preeti-to-unicode/">Preeti ↔ Unicode</a><a href="/tools/nepali-date-converter/">BS ↔ AD</a><a href="/tools/income-tax-calculator/">Income Tax</a><a href="/tools/number-to-nepali-words/">Number to Words</a><a href="/tools/nepal-map/">Nepal Map</a><a href="/tools/today-nepali-date/">Today's Date</a><a href="/tools/nepali-spell-checker/">Spell Checker</a></nav>`;

const FOOTER_BLOCK = `<footer class="site-footer">
  <div class="bar footer-bar">
    ${FOOTER_NAV}
    <div class="footer-meta">
      <p class="footer-copy">© <span id="yr"></span> Powered By Digital (PBD)</p>
      <nav class="footer-legal" aria-label="Legal"><a href="/about/">About</a><a href="/privacy/">Privacy</a></nav>
    </div>
  </div>
</footer>`;
