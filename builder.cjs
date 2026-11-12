/**
 * builder.cjs — injects static site chrome and catalog cards at build time.
 * Run:  node builder.cjs
 *
 * Single source of truth for:
 *   - Logo mark + site title (PBD / Powered By Digital)
 *   - Top nav links
 *   - Footer pills (from catalog footer:true) + copyright / legal
 *   - Tools / Widgets / Guides catalog cards (index pages)
 *   - Homepage featured tools / widgets / guides grids
 *   - AdSense script presence (check + fix mode)
 *
 * Source HTML pages should keep only structural placeholders:
 *   <header class="site-header"><div class="bar"></div></header>
 *   <main id="tools|widgets|guides">…</main>   (catalog pages only)
 *   <div class="tool-grid" data-builder="featured-tools|featured-widgets|featured-guides"></div>
 *   <footer class="site-footer"></footer>
 *
 * AdSense: builder ensures the canonical client script is in <head> on every
 * page except the skip list (offline.html). Missing or broken tags are fixed.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");

/** Google AdSense publisher client — keep identical on every monetized page */
const ADSENSE_CLIENT = "ca-pub-6632604868005505";
const ADSENSE_SCRIPT =
  `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;

/** Relative paths (from public/) that must not load AdSense */
const ADSENSE_SKIP = new Set(["offline.html"]);

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

/* Catalog data loaded from builder-catalog.cjs */
const { TOOLS, WIDGETS, GUIDES } = require("./builder-catalog.cjs");

/** Load featured items from featured.json or featured-tools.json with catalog fallback */
function loadFeaturedData() {
  let featuredConfig = null;
  const featuredPath = path.join(__dirname, "featured.json");
  const featuredToolsPath = path.join(__dirname, "featured-tools.json");

  if (fs.existsSync(featuredPath)) {
    try {
      featuredConfig = JSON.parse(fs.readFileSync(featuredPath, "utf8"));
    } catch (e) {
      console.warn("Failed to parse featured.json:", e.message);
    }
  } else if (fs.existsSync(featuredToolsPath)) {
    try {
      featuredConfig = JSON.parse(fs.readFileSync(featuredToolsPath, "utf8"));
    } catch (e) {
      console.warn("Failed to parse featured-tools.json:", e.message);
    }
  }

  let tools = null;
  let widgets = null;
  let guides = null;

  if (featuredConfig) {
    if (Array.isArray(featuredConfig)) {
      tools = featuredConfig;
    } else if (typeof featuredConfig === "object") {
      if (Array.isArray(featuredConfig.tools)) tools = featuredConfig.tools;
      if (Array.isArray(featuredConfig.widgets)) widgets = featuredConfig.widgets;
      if (Array.isArray(featuredConfig.guides)) guides = featuredConfig.guides;
    }
  }

  return {
    tools: tools || TOOLS.filter((t) => t.featured),
    widgets: widgets || WIDGETS.filter((w) => w.featured),
    guides: guides || GUIDES.filter((g) => g.featured),
  };
}

/** Footer pills from catalog items with footer: true (shortTitle optional) */
function buildFooterNav() {
  const pills = TOOLS.filter((t) => t.footer).map((t) => {
    const label = t.shortTitle || t.title;
    return `<a href="${t.href}">${label}</a>`;
  });
  return `<nav id="footer-menu" class="footer-pills" aria-label="Footer">${pills.join("")}</nav>`;
}

const FOOTER_BLOCK = `<footer class="site-footer">
  <div class="bar footer-bar">
    ${buildFooterNav()}
    <div class="footer-meta">
      <p class="footer-copy">© <span id="yr"></span> Powered By Digital (PBD)</p>
      <nav class="footer-legal" aria-label="Legal"><a href="/about/">About</a><a href="/privacy/">Privacy</a></nav>
    </div>
  </div>
</footer>`;

function cardHtml(item) {
  return `          <a class="tool-card" href="${item.href}">
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
            <div class="tool-meta">${item.category}</div>
          </a>`;
}

function featuredGridHtml(items) {
  const list = items.some((i) => i.featured) ? items.filter((i) => i.featured) : items;
  return list.map(cardHtml).join("\n");
}

function slugifyCategory(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Unique categories in first-seen order from TOOLS */
function toolCategories() {
  const seen = new Set();
  const list = [];
  for (const t of TOOLS) {
    const c = t.category;
    if (!c || seen.has(c)) continue;
    seen.add(c);
    list.push({ id: slugifyCategory(c), title: c });
  }
  return list;
}

function generateToolsMain() {
  const cats = toolCategories();
  const catNav = cats
    .map((c) => `          <a href="#${c.id}">${c.title}</a>`)
    .join("\n");

  const sections = cats
    .map((cat, idx) => {
      const items = TOOLS.filter((t) => t.category === cat.title);
      const cards = items.map(cardHtml).join("\n");
      const alt = idx % 2 === 1 ? " section-alt" : "";
      return `    <section id="${cat.id}" class="section${alt}">
      <div class="container">
        <h2>${cat.title}</h2>
        <div class="tool-grid">
${cards}
        </div>
      </div>
    </section>`;
    })
    .join("\n\n");

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
  let i = html.indexOf(">", openStart) + 1;
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

function replaceBalancedToolGridAfter(html, searchFrom, items) {
  const chunk = html.slice(searchFrom);
  const gm = /<div\s+class=["']tool-grid["'][^>]*>/i.exec(chunk);
  if (!gm) return html;
  const openStart = searchFrom + gm.index;
  let i = openStart + gm[0].length;
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
  const replacement = '<div class="tool-grid">\n' + inner + "\n        </div>";
  return html.slice(0, openStart) + replacement + html.slice(i);
}

function injectFeaturedBySection(html, sectionId, items) {
  const needle = 'id="' + sectionId + '"';
  const pos = html.indexOf(needle);
  if (pos === -1) return html;
  const slice = html.slice(pos, pos + 3000);
  if (slice.includes("data-builder=")) return html;
  return replaceBalancedToolGridAfter(html, pos, items);
}

function injectFeaturedByHeading(html, heading, items) {
  const marker = "<h2>" + heading + "</h2>";
  const pos = html.indexOf(marker);
  if (pos === -1) return html;
  const slice = html.slice(pos, pos + 2500);
  if (slice.includes("data-builder=")) return html;
  return replaceBalancedToolGridAfter(html, pos, items);
}

/** True when the file looks like a real HTML document (not a stub/placeholder). */
function isRealHtml(html) {
  return /<html\b/i.test(html) || /<head\b/i.test(html);
}

/**
 * AdSense status for a page.
 * @returns {"skip"|"ok"|"broken"|"missing"}
 */
function detectAdSense(html, rel) {
  if (ADSENSE_SKIP.has(rel)) return "skip";
  // Non-HTML stubs (e.g. "PLACEHOLDER") — do not touch
  if (!isRealHtml(html)) return "skip";

  const hasClient = html.includes(ADSENSE_CLIENT);
  const hasScriptSrc =
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html) ||
    /adsbygoogle\.js\?client=/i.test(html);

  if (hasClient && hasScriptSrc) return "ok";
  if (hasScriptSrc || /adsbygoogle/i.test(html)) return "broken";
  return "missing";
}

/**
 * Ensure canonical AdSense script is present in <head>.
 * Replaces broken adsbygoogle loader tags; injects when missing.
 * Only operates on real HTML documents.
 * @returns {{ html: string, status: string, fixed: boolean }}
 */
function ensureAdSense(html, rel) {
  const status = detectAdSense(html, rel);
  if (status === "skip" || status === "ok") {
    return { html, status, fixed: false };
  }

  // Remove any existing adsbygoogle / pagead loader scripts (broken or partial)
  let next = html.replace(
    /<script\b[^>]*\bsrc=["'][^"']*adsbygoogle\.js[^"']*["'][^>]*>\s*<\/script>/gi,
    ""
  );
  next = next.replace(
    /<script\b[^>]*\bsrc=["'][^"']*pagead2\.googlesyndication\.com[^"']*["'][^>]*>\s*<\/script>/gi,
    ""
  );
  // Also strip self-closing or unclosed variants that only have the opening tag
  next = next.replace(
    /<script\b[^>]*\bsrc=["'][^"']*(?:adsbygoogle\.js|pagead2\.googlesyndication\.com)[^"']*["'][^>]*\/?>/gi,
    ""
  );

  if (/<\/head>/i.test(next)) {
    next = next.replace(/<\/head>/i, `  ${ADSENSE_SCRIPT}\n</head>`);
  } else if (/<head\b[^>]*>/i.test(next)) {
    next = next.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${ADSENSE_SCRIPT}`);
  } else {
    // Real HTML but no head tag — leave unchanged, report as broken
    return { html, status: "broken", fixed: false };
  }

  return { html: next, status, fixed: true };
}

function patchFile(file) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  let adsenseNote = null;

  if (/<header\b[^>]*class=["'][^"']*site-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i.test(html)) {
    html = html.replace(
      /<header\b[^>]*class=["'][^"']*site-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i,
      HEADER_BLOCK
    );
  }

  if (/<footer\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i.test(html)) {
    html = html.replace(
      /<footer\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i,
      FOOTER_BLOCK
    );
  }

  if (rel === "tools/index.html") {
    html = html.replace(
      /<main\b[^>]*\bid=["']tools["'][^>]*>[\s\S]*?<\/main>/i,
      generateToolsMain()
    );
  } else if (rel === "widgets/index.html") {
    html = html.replace(
      /<main\b[^>]*\bid=["']widgets["'][^>]*>[\s\S]*?<\/main>/i,
      generateWidgetsMain()
    );
  } else if (rel === "guides/index.html") {
    html = html.replace(
      /<main\b[^>]*\bid=["']guides["'][^>]*>[\s\S]*?<\/main>/i,
      generateGuidesMain()
    );
  }

  if (rel === "index.html") {
    const featured = loadFeaturedData();
    html = injectFeaturedGrid(html, "featured-tools", featured.tools);
    html = injectFeaturedGrid(html, "featured-widgets", featured.widgets);
    html = injectFeaturedGrid(html, "featured-guides", featured.guides);
    // Fallbacks when source still has hard-coded grids (no data-builder yet)
    html = injectFeaturedBySection(html, "featured", featured.tools);
    html = injectFeaturedByHeading(html, "Widgets", featured.widgets);
    html = injectFeaturedByHeading(html, "Guides", featured.guides);
  }

  // AdSense check + fix (runs on every HTML page)
  const ads = ensureAdSense(html, rel);
  html = ads.html;
  if (ads.fixed) {
    adsenseNote = ads.status; // "missing" or "broken"
  }

  if (html === before) {
    return { changed: false, adsense: ads.status, adsenseFixed: false };
  }
  fs.writeFileSync(file, html);
  return {
    changed: true,
    adsense: ads.status,
    adsenseFixed: ads.fixed,
    adsenseNote,
  };
}

const files = walk(ROOT);
let changed = 0;
const adsenseStats = { ok: 0, fixed: 0, skipped: 0, brokenLeft: 0 };
const adsenseFixedFiles = [];

for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const result = patchFile(f);
  if (result.changed) {
    changed++;
    const extra = result.adsenseFixed
      ? ` [adsense ${result.adsenseNote} → fixed]`
      : "";
    console.log("updated", rel + extra);
  }
  if (result.adsense === "skip") adsenseStats.skipped++;
  else if (result.adsenseFixed) {
    adsenseStats.fixed++;
    adsenseFixedFiles.push(rel);
  } else if (result.adsense === "ok") adsenseStats.ok++;
  else adsenseStats.brokenLeft++;
}

console.log(`Done. ${changed}/${files.length} files updated.`);
console.log(
  `AdSense: ${adsenseStats.ok} OK, ${adsenseStats.fixed} fixed, ${adsenseStats.skipped} skipped` +
    (adsenseStats.brokenLeft ? `, ${adsenseStats.brokenLeft} still broken` : "")
);
if (adsenseFixedFiles.length) {
  console.log("  fixed:", adsenseFixedFiles.join(", "));
}
