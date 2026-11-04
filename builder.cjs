/**
 * builder.cjs — injects static site chrome and catalog cards at build time.
 * Run:  node builder.cjs
 *
 * Single source of truth for:
 *   - Logo mark + site title (PBD / Powered By Digital)
 *   - Top nav links
 *   - Footer pills + copyright / legal
 *   - Tools / Widgets / Guides catalog cards (index pages)
 *   - Homepage featured tools / widgets / guides grids
 *
 * Source HTML pages should keep only structural placeholders:
 *   <header class="site-header"><div class="bar"></div></header>
 *   <main id="tools|widgets|guides">…</main>   (catalog pages only)
 *   <div class="tool-grid" data-builder="featured-tools|featured-widgets|featured-guides"></div>
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

/* Catalog data loaded from builder-catalog.cjs */
const { TOOLS, WIDGETS, GUIDES, TOOL_CATEGORIES } = require("./builder-catalog.cjs");

/* ------------------------------------------------------------------ */
/* HTML generators                                                    */
/* ------------------------------------------------------------------ */

function cardHtml(item) {
  return `          <a class="tool-card" href="${item.href}">
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
            <div class="tool-meta">${item.category}</div>
          </a>`;
}

function featuredGridHtml(items) {
  const list = items.filter((i) => i.featured);
  const cards = (list.length ? list : items).map(cardHtml).join("\n");
  return cards;
}

function generateToolsMain() {
  const catNav = TOOL_CATEGORIES.map(
    (c) => `          <a href="#${c.id}">${c.title}</a>`
  ).join("\n");

  const sections = TOOL_CATEGORIES.map((cat, idx) => {
    const items = TOOLS.filter((t) => t.category === cat.title);
    const cards = items.map(cardHtml).join("\n");
    const alt = idx % 2 === 1 ? " section-alt" : "";
    return `    <section id="${cat.id}" class="section${alt}">
      <div class="container">
        <h2>${cat.title}</h2>
        <p class="section-lead">${cat.lead}</p>
        <div class="tool-grid">
${cards}
        </div>
      </div>
    </section>`;
  }).join("\n\n");

  return `<main id="tools">
    <section class="page-hero">
      <div class="container">
        <h1>All tools</h1>
        <p>Free, private, client-side utilities built for everyday tasks in Nepal. No sign-up required.</p>
        <nav class="cat-nav" aria-label="Jump to category">
${catNav}
        </nav>
      </div>
    </section>

${sections}
  </main>`;
}

function generateWidgetsMain() {
  const cards = WIDGETS.map(cardHtml).join("\n");
  return `<main id="widgets">
    <section class="page-hero"><div class="container"><h1>Widgets</h1><p>Embeddable widgets you can drop into any page with a simple iframe. Free and no tracking.</p></div></section>
    <section class="section"><div class="container"><div class="tool-grid">
${cards}
    </div></div></section>
  </main>`;
}

function generateGuidesMain() {
  const cards = GUIDES.map(cardHtml).join("\n");
  return `<main id="guides">
    <section class="page-hero"><div class="container"><h1>Guides</h1><p>Practical how-to articles for freelancers, students and beginners in Nepal.</p></div></section>
    <section class="section"><div class="container"><div class="tool-grid">
${cards}
    </div></div></section>
  </main>`;
}

/* ------------------------------------------------------------------ */
/* File walk + patch                                                  */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name === "index.html" || name.endsWith(".html")) out.push(full);
  }
  return out;
}

function injectFeaturedGrid(html, key, items) {
  const needle = 'data-builder="' + key + '"';
  const alt = "data-builder='" + key + "'";
  let openStart = html.indexOf(needle);
  if (openStart === -1) openStart = html.indexOf(alt);
  if (openStart === -1) return html;
  openStart = html.lastIndexOf("<div", openStart);
  if (openStart === -1) return html;
  const openEnd = html.indexOf(">", openStart) + 1;
  let i = openEnd;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
    }
  }
  const inner = featuredGridHtml(items);
  const replacement =
    '<div class="tool-grid" data-builder="' + key + '">\n' +
    inner +
    "\n        </div>";
  return html.slice(0, openStart) + replacement + html.slice(i);
}

function patchFile(file) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");

  if (/<header\\b[^>]*class=["'][^"']*site-header[^"']*["'][^>]*>[\\s\\S]*?<\\/header>/i.test(html)) {
    html = html.replace(
      /<header\\b[^>]*class=["'][^"']*site-header[^"']*["'][^>]*>[\\s\\S]*?<\\/header>/i,
      HEADER_BLOCK
    );
  }

  if (/<footer\\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\\s\\S]*?<\\/footer>/i.test(html)) {
    html = html.replace(
      /<footer\\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\\s\\S]*?<\\/footer>/i,
      FOOTER_BLOCK
    );
  }

  if (rel === "tools/index.html") {
    html = html.replace(
      /<main\\b[^>]*\\bid=["']tools["'][^>]*>[\\s\\S]*?<\\/main>/i,
      generateToolsMain()
    );
  } else if (rel === "widgets/index.html") {
    html = html.replace(
      /<main\\b[^>]*\\bid=["']widgets["'][^>]*>[\\s\\S]*?<\\/main>/i,
      generateWidgetsMain()
    );
  } else if (rel === "guides/index.html") {
    html = html.replace(
      /<main\\b[^>]*\\bid=["']guides["'][^>]*>[\\s\\S]*?<\\/main>/i,
      generateGuidesMain()
    );
  }

  if (rel === "index.html") {
    html = injectFeaturedGrid(html, "featured-tools", TOOLS);
    html = injectFeaturedGrid(html, "featured-widgets", WIDGETS);
    html = injectFeaturedGrid(html, "featured-guides", GUIDES);
  }

  if (html === before) return false;
  fs.writeFileSync(file, html);
  return true;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  if (patchFile(f)) {
    changed++;
    console.log("updated", path.relative(ROOT, f));
  }
}
console.log(`Done. ${changed}/${files.length} files updated.`);
