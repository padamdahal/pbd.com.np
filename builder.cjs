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

/** Centralized Google AdSense config (manual reserved slots + skip list) */
const ADSENSE_CONFIG = require("./adsense-config.cjs");
const ADSENSE_CLIENT = ADSENSE_CONFIG.client;

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
  const list = items.filter((i) => i.featured);
  return (list.length ? list : items).map(cardHtml).join("\n");
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
 * Determine manual ad slot type for a given relative HTML path.
 * @returns {"tool"|"guide"|"about"|null}
 */
function getAdSlotType(html, rel) {
  if (!isRealHtml(html) || ADSENSE_CONFIG.skipPages.has(rel)) return null;
  if (rel === "about/index.html") return "about";
  if (rel.startsWith("tools/") && rel !== "tools/index.html") return "tool";
  if (rel.startsWith("guides/") && rel !== "guides/index.html") return "guide";
  return null;
}

/**
 * Strip eager Auto Ads <script> tags and previous manual ad slot blocks so
 * rebuilds are strictly idempotent and Auto Ads overlays stay off.
 */
function stripAdSenseArtifacts(html) {
  let next = html.replace(
    /[ \t]*<script\b[^>]*\bsrc=["'][^"']*(?:adsbygoogle\.js|pagead2\.googlesyndication\.com)[^"']*["'][^>]*>\s*<\/script>\r?\n?/gi,
    ""
  );
  next = next.replace(
    /[ \t]*<script\b[^>]*\bsrc=["'][^"']*(?:adsbygoogle\.js|pagead2\.googlesyndication\.com)[^"']*["'][^>]*\/?>\r?\n?/gi,
    ""
  );
  next = next.replace(
    /[ \t]*<!--\s*pbd:ad-slot:start\s*-->[\s\S]*?<!--\s*pbd:ad-slot:end\s*-->\r?\n?/gi,
    ""
  );
  next = next.replace(
    /[ \t]*<script\b[^>]*\bsrc=["']\/assets\/ads\.js["'][^>]*><\/script>\r?\n?/gi,
    ""
  );
  return next;
}

function buildAdSlotBlock(slotType, indent = "    ") {
  const slotId = String((ADSENSE_CONFIG.slots && ADSENSE_CONFIG.slots[slotType]) || "").trim();
  const hasSlot = /^\d+$/.test(slotId);
  const hiddenAttr = hasSlot ? "" : " hidden";
  const format = slotType === "about" ? "auto" : "horizontal";
  return `${indent}<!-- pbd:ad-slot:start -->
${indent}<aside class="ad-slot" data-ad-type="${slotType}" data-ad-slot="${slotId}" aria-label="Advertisement"${hiddenAttr}>
${indent}  <p class="ad-slot-label">Advertisement</p>
${indent}  <div class="ad-slot-inner">
${indent}    <ins class="adsbygoogle"
${indent}      style="display:block"
${indent}      data-ad-client="${ADSENSE_CLIENT}"
${indent}      data-ad-slot="${slotId}"
${indent}      data-ad-format="${format}"
${indent}      data-full-width-responsive="true"></ins>
${indent}  </div>
${indent}</aside>
${indent}<!-- pbd:ad-slot:end -->\n`;
}

/**
 * Replace Auto Ads with a single non-intrusive manual slot above the FAQ section
 * (or above </main> if no FAQ section exists) and defer /assets/ads.js loading.
 * @returns {{ html: string, status: string, fixed: boolean }}
 */
function ensureAdSense(html, rel) {
  const slotType = getAdSlotType(html, rel);
  let next = stripAdSenseArtifacts(html);

  if (!slotType) {
    return { html: next, status: "skip", fixed: next !== html };
  }

  const faqAnchor = /([ \t]*)(<section\b[^>]*(?:\bclass=["'][^"']*\bfaq\b[^"']*["']|\bid=["']faq["'])[^>]*>)/i;
  const helpAnchor = /([ \t]*)(<div\b[^>]*class=["'][^"']*\bhelp-section\b[^"']*["'][^>]*>)/i;
  const mainClose = /([ \t]*)(<\/main>)/i;

  if (faqAnchor.test(next)) {
    next = next.replace(faqAnchor, (_m, indent, tag) => `${buildAdSlotBlock(slotType, indent || "    ")}${indent}${tag}`);
  } else if (helpAnchor.test(next)) {
    next = next.replace(helpAnchor, (_m, indent, tag) => `${buildAdSlotBlock(slotType, indent || "    ")}${indent}${tag}`);
  } else if (mainClose.test(next)) {
    next = next.replace(mainClose, (_m, indent, tag) => `${buildAdSlotBlock(slotType, indent || "    ")}${indent}${tag}`);
  }

  const adsScript = '  <script src="/assets/ads.js" defer></script>\n';
  if (/<\/body>/i.test(next)) {
    next = next.replace(/<\/body>/i, `${adsScript}</body>`);
  }

  const slotId = String((ADSENSE_CONFIG.slots && ADSENSE_CONFIG.slots[slotType]) || "").trim();
  const status = /^\d+$/.test(slotId) ? "active" : "standby";
  return { html: next, status, fixed: next !== html };
}

function patchFile(file) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");

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
    html = injectFeaturedGrid(html, "featured-tools", TOOLS);
    html = injectFeaturedGrid(html, "featured-widgets", WIDGETS);
    html = injectFeaturedGrid(html, "featured-guides", GUIDES);
    // Fallbacks when source still has hard-coded grids (no data-builder yet)
    html = injectFeaturedBySection(html, "featured", TOOLS);
    html = injectFeaturedByHeading(html, "Widgets", WIDGETS);
    html = injectFeaturedByHeading(html, "Guides", GUIDES);
  }

  // Robots & Canonical check + fix (runs on indexable HTML pages)
  html = ensureRobotsMeta(html, rel);
  html = ensureCanonical(html, rel);

  // Manual reserved AdSense slot sync (replaces eager Auto Ads)
  const ads = ensureAdSense(html, rel);
  html = ads.html;

  if (html === before) {
    return { changed: false, adsense: ads.status, adsenseFixed: false };
  }
  fs.writeFileSync(file, html);
  return {
    changed: true,
    adsense: ads.status,
    adsenseFixed: ads.fixed,
  };
}

const ROBOTS_SKIP = new Set([
  "offline.html",
  "tools/nepal-invoice-generator/index.html",
]);

function ensureRobotsMeta(html, rel) {
  if (ROBOTS_SKIP.has(rel) || !isRealHtml(html)) return html;
  if (/<meta\s+name=["']robots["']/i.test(html)) return html;
  const tag = '  <meta name="robots" content="index, follow, max-image-preview:large">\n';
  if (/<\/title>/i.test(html)) {
    return html.replace(/<\/title>/i, `</title>\n${tag}`);
  }
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  return html;
}

function ensureCanonical(html, rel) {
  if (ROBOTS_SKIP.has(rel) || !isRealHtml(html)) return html;
  if (/<link\s+rel=["']canonical["']/i.test(html)) return html;
  let canonicalPath = rel.replace(/index\.html$/i, "");
  if (canonicalPath && !canonicalPath.endsWith("/")) canonicalPath += "/";
  const tag = `  <link rel="canonical" href="https://pbd.com.np/${canonicalPath}">\n`;
  if (/<\/title>/i.test(html)) {
    return html.replace(/<\/title>/i, `</title>\n${tag}`);
  }
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  return html;
}

function generateSitemap() {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    { loc: "https://pbd.com.np/", changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: "https://pbd.com.np/tools/", changefreq: "weekly", priority: "0.9", lastmod: today },
    { loc: "https://pbd.com.np/guides/", changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: "https://pbd.com.np/widgets/", changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: "https://pbd.com.np/about/", changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: "https://pbd.com.np/privacy/", changefreq: "monthly", priority: "0.4", lastmod: today },
  ];

  for (const t of TOOLS) {
    if (t.href) {
      urls.push({
        loc: `https://pbd.com.np${t.href}`,
        changefreq: "weekly",
        priority: t.featured ? "0.9" : "0.8",
        lastmod: today,
      });
    }
  }

  for (const w of WIDGETS) {
    if (w.href) {
      urls.push({
        loc: `https://pbd.com.np${w.href}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: today,
      });
    }
  }

  for (const g of GUIDES) {
    if (g.href) {
      urls.push({
        loc: `https://pbd.com.np${g.href}`,
        changefreq: "monthly",
        priority: "0.8",
        lastmod: today,
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>\n`;

  const sitemapPath = path.join(ROOT, "sitemap.xml");
  const prevXml = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  if (prevXml !== xml) {
    fs.writeFileSync(sitemapPath, xml, "utf8");
    console.log(`Generated sitemap.xml with ${urls.length} URLs (lastmod: ${today}).`);
  }
}

const files = walk(ROOT);
let changed = 0;
const adsenseStats = { active: 0, standby: 0, skipped: 0 };

for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const result = patchFile(f);
  if (result.changed) {
    changed++;
    console.log("updated", rel);
  }
  if (result.adsense === "skip") adsenseStats.skipped++;
  else if (result.adsense === "active") adsenseStats.active++;
  else adsenseStats.standby++;
}

generateSitemap();

console.log(`Done. ${changed}/${files.length} files updated.`);
console.log(
  `AdSense manual slots: ${adsenseStats.active} active, ${adsenseStats.standby} standby (awaiting slot ID), ${adsenseStats.skipped} ad-free.`
);
