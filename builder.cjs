/**
 * builder.cjs — compiles src/ into a clean, minified public/ directory.
 * Run:  node builder.cjs
 *
 * Single source of truth for:
 *   - Reading unminified authored source from src/ (never mutating src/)
 *   - Cleanly wiping and rebuilding public/ on every run
 *   - Injecting canonical header, footer, catalog pages, featured grids,
 *     robots/canonical tags, and AdSense loader
 *   - Zero-dependency minification of HTML, CSS, JS, inline <style>/<script>,
 *     and JSON-LD blocks
 *   - Fail-fast Node vm.Script & JSON.parse verification gate on all minified
 *     JS and JSON-LD output
 *   - Generating public/sitemap.xml
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC_ROOT = path.join(__dirname, "src");
const OUT_ROOT = path.join(__dirname, "public");

/** Google AdSense publisher client — keep identical on every monetized page */
const ADSENSE_CLIENT = "ca-pub-6632604868005505";
const ADSENSE_SCRIPT =
  `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;

/** Relative paths (from src/) that must not load AdSense */
const ADSENSE_SKIP = new Set();

/** Relative paths (from src/) skipped for robots/canonical auto-injection */
const ROBOTS_SKIP = new Set([
  "tools/nepal-invoice-generator/index.html",
]);

/** Canonical brand — keep identical on every page */
const BRAND = `<a class="brand" href="/" aria-label="Powered By Digital (PBD) — Home"><span class="logo-mark" aria-hidden="true">P</span><span class="brand-text"><span class="brand-name">PBD</span><span class="brand-full">Powered By Digital</span></span></a>`;

const NAV_TOGGLE = `<button type="button" id="nav-toggle" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>`;

const HEADER_NAV = `<nav id="menu" class="site-nav" aria-label="Main navigation" role="navigation"><a href="/">Home</a><a href="/tools/">Tools</a><a href="/widgets/">Widgets</a><a href="/guides/">Guides</a><a href="/about/">About</a></nav>`;

const HEADER_BLOCK = `<header class="site-header">
    <div class="bar">
      ${BRAND}
      ${NAV_TOGGLE}
      ${HEADER_NAV}
    </div>
  </header>`;

/* Catalog data loaded from builder-catalog.cjs */
const {
  SITE_ORIGIN = "https://pbd.com.np",
  MOVED_TOOLS_ORIGIN = "https://nepaliwebtools.link",
  TOOLS,
  WIDGETS,
  GUIDES,
} = require("./builder-catalog.cjs");

function normalizePathSlash(p) {
  let s = String(p || "").trim();
  if (!s.startsWith("/")) s = "/" + s;
  s = s.replace(/index\.html$/i, "");
  if (!s.endsWith("/")) s += "/";
  return s;
}

const MOVED_BY_REL = new Map();
const MOVED_BY_PATH = new Map();
for (const item of [...TOOLS, ...WIDGETS, ...GUIDES]) {
  if (!item.movedTo || !item.href) continue;
  const normPath = normalizePathSlash(item.href);
  const relPath = normPath.replace(/^\/+/, "") + "index.html";
  let host = "nepaliwebtools.link";
  try {
    host = new URL(item.movedTo).host;
  } catch {
    // keep default host label
  }
  const entry = {
    href: normPath,
    movedTo: item.movedTo,
    title: item.title,
    host,
    relPath,
  };
  MOVED_BY_REL.set(relPath, entry);
  MOVED_BY_PATH.set(normPath, entry);
}

/** Footer pills from catalog items with footer: true (shortTitle optional) */
function buildFooterNav() {
  const pills = TOOLS.filter((t) => t.footer).map((t) => {
    const label = t.shortTitle || t.title;
    const href = t.movedTo || t.href;
    const extAttrs = t.movedTo ? ' rel="noopener"' : "";
    return `<a href="${href}"${extAttrs}>${label}</a>`;
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
  if (item.movedTo) {
    let host = "nepaliwebtools.link";
    try {
      host = new URL(item.movedTo).host;
    } catch {
      // keep default
    }
    return `          <a class="tool-card" href="${item.movedTo}" rel="noopener">
            <h3>${item.title} <span aria-hidden="true">↗</span></h3>
            <p>${item.desc}</p>
            <div class="tool-meta">${item.category} · ${host}</div>
          </a>`;
  }
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

function walkAll(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkAll(full, out);
    else if (st.isFile()) out.push(full);
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

function isRealHtml(html) {
  return /<html\b/i.test(html) || /<head\b/i.test(html);
}

function detectAdSense(html, rel) {
  if (ADSENSE_SKIP.has(rel)) return "skip";
  if (!isRealHtml(html)) return "skip";

  const hasClient = html.includes(ADSENSE_CLIENT);
  const hasScriptSrc =
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html) ||
    /adsbygoogle\.js\?client=/i.test(html);

  if (hasClient && hasScriptSrc) return "ok";
  if (hasScriptSrc || /adsbygoogle/i.test(html)) return "broken";
  return "missing";
}

function ensureAdSense(html, rel) {
  const status = detectAdSense(html, rel);
  if (status === "skip" || status === "ok") {
    return { html, status, fixed: false };
  }

  let next = html.replace(
    /<script\b[^>]*\bsrc=["'][^"']*adsbygoogle\.js[^"']*["'][^>]*>\s*<\/script>/gi,
    ""
  );
  next = next.replace(
    /<script\b[^>]*\bsrc=["'][^"']*pagead2\.googlesyndication\.com[^"']*["'][^>]*>\s*<\/script>/gi,
    ""
  );
  next = next.replace(
    /<script\b[^>]*\bsrc=["'][^"']*(?:adsbygoogle\.js|pagead2\.googlesyndication\.com)[^"']*["'][^>]*\/?>/gi,
    ""
  );

  if (/<\/head>/i.test(next)) {
    next = next.replace(/<\/head>/i, `  ${ADSENSE_SCRIPT}\n</head>`);
  } else if (/<head\b[^>]*>/i.test(next)) {
    next = next.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${ADSENSE_SCRIPT}`);
  } else {
    return { html, status: "broken", fixed: false };
  }

  return { html: next, status, fixed: true };
}

function ensureRobotsMeta(html, rel) {
  if (ROBOTS_SKIP.has(rel) || !isRealHtml(html)) return html;
  const moved = MOVED_BY_REL.get(rel);
  const robotsRe = /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i;
  const standardTag = '<meta name="robots" content="index, follow, max-image-preview:large">';

  if (moved) {
    // Cross-domain canonical pages must stay indexable (never mix noindex + canonical)
    const existing = html.match(robotsRe);
    if (existing) {
      if (/\bnoindex\b/i.test(existing[0])) {
        return html.replace(robotsRe, standardTag);
      }
      return html;
    }
  } else if (robotsRe.test(html)) {
    return html;
  }

  const tag = `  ${standardTag}\n`;
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
  const moved = MOVED_BY_REL.get(rel);
  const canonicalRe = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;

  if (moved) {
    const newTag = `<link rel="canonical" href="${moved.movedTo}">`;
    if (canonicalRe.test(html)) {
      return html.replace(canonicalRe, newTag);
    }
    if (/<\/title>/i.test(html)) {
      return html.replace(/<\/title>/i, `</title>\n  ${newTag}`);
    }
    if (/<head\b[^>]*>/i.test(html)) {
      return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${newTag}`);
    }
    return html;
  }

  if (canonicalRe.test(html)) return html;
  let canonicalPath = rel.replace(/index\.html$/i, "");
  if (canonicalPath && !canonicalPath.endsWith("/")) canonicalPath += "/";
  const tag = `  <link rel="canonical" href="${SITE_ORIGIN}/${canonicalPath}">\n`;
  if (/<\/title>/i.test(html)) {
    return html.replace(/<\/title>/i, `</title>\n${tag}`);
  }
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  return html;
}

function ensureOgUrl(html, rel) {
  if (ROBOTS_SKIP.has(rel) || !isRealHtml(html)) return html;
  const moved = MOVED_BY_REL.get(rel);
  if (!moved) return html;

  const ogUrlRe = /<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i;
  const newTag = `<meta property="og:url" content="${moved.movedTo}">`;
  if (ogUrlRe.test(html)) {
    return html.replace(ogUrlRe, newTag);
  }
  if (/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i.test(html)) {
    return html.replace(
      /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i,
      (m) => `${m}\n  ${newTag}`
    );
  }
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `  ${newTag}\n</head>`);
  }
  return html;
}

function resolveMovedPageUrl(rawUrl, baseUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^(?:mailto:|tel:|javascript:|data:)/i.test(trimmed)
  ) {
    return null;
  }
  let u;
  try {
    u = new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
  if (u.origin !== SITE_ORIGIN) return null;

  const rawPath = u.pathname;
  const normPath = normalizePathSlash(rawPath);
  const entry = MOVED_BY_PATH.get(normPath);
  if (!entry) return null;

  // Ensure this is the page route itself (not a sub-asset like /tools/slug/app.js or /icons/...)
  const lowerRaw = rawPath.toLowerCase();
  const isPageRoute =
    rawPath === entry.href ||
    rawPath + "/" === entry.href ||
    lowerRaw === entry.href + "index.html";
  if (!isPageRoute) return null;

  return entry.movedTo + u.search + u.hash;
}

function alignJsonLdMovedUrls(html, rel) {
  if (!MOVED_BY_PATH.size || !isRealHtml(html)) return html;
  const baseUrl = `${SITE_ORIGIN}/${rel}`;

  function walkVal(val) {
    if (typeof val === "string") {
      if (val.startsWith(SITE_ORIGIN + "/")) {
        const replaced = resolveMovedPageUrl(val, baseUrl);
        return replaced || val;
      }
      return val;
    }
    if (Array.isArray(val)) return val.map(walkVal);
    if (val && typeof val === "object") {
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = walkVal(v);
      }
      return out;
    }
    return val;
  }

  return html.replace(
    /(<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script\s*>)/gi,
    (full, open, body, close) => {
      try {
        const parsed = JSON.parse(body);
        const updated = walkVal(parsed);
        const serialized = JSON.stringify(updated).replace(/<\/script/gi, "<\\/script");
        return open + serialized + close;
      } catch {
        return full;
      }
    }
  );
}

function rewriteMovedAnchors(html, rel) {
  if (!MOVED_BY_PATH.size || !isRealHtml(html)) return html;
  const baseUrl = `${SITE_ORIGIN}/${rel}`;

  return html.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    if (!hrefMatch) return full;
    const rawHref = hrefMatch[1] !== undefined ? hrefMatch[1] : hrefMatch[2];
    const targetUrl = resolveMovedPageUrl(rawHref, baseUrl);
    if (!targetUrl) return full;

    let nextAttrs = attrs.replace(
      /\bhref\s*=\s*(?:"[^"]*"|'[^']*')/i,
      `href="${targetUrl}"`
    );

    if (/\brel\s*=\s*(?:"([^"]*)"|'([^']*)')/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(
        /\brel\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
        (_m, r1, r2) => {
          const tokens = (r1 !== undefined ? r1 : r2)
            .split(/\s+/)
            .filter((t) => t && t.toLowerCase() !== "nofollow");
          if (!tokens.some((t) => t.toLowerCase() === "noopener")) {
            tokens.push("noopener");
          }
          return `rel="${tokens.join(" ")}"`;
        }
      );
    } else {
      nextAttrs += ' rel="noopener"';
    }

    return `<a${nextAttrs}>`;
  });
}

const MOVED_BANNER_CSS = `<style data-pbd-moved>.pbd-moved-banner{background:#eef7f8;border-bottom:1px solid #cce3e7;color:#13232b;font-size:.88rem;line-height:1.45}.pbd-moved-inner{width:min(calc(100% - 32px),1000px);margin:0 auto;padding:9px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 14px}.pbd-moved-banner a{color:#075866;font-weight:700;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}.pbd-moved-banner a:hover{color:#0b7285}@media print{.pbd-moved-banner{display:none!important}}</style>`;

function injectMovedNotice(html, rel) {
  const moved = MOVED_BY_REL.get(rel);
  if (!moved || !isRealHtml(html)) return html;

  let next = html;
  if (!next.includes("data-pbd-moved") && /<\/head>/i.test(next)) {
    next = next.replace(/<\/head>/i, `  ${MOVED_BANNER_CSS}\n</head>`);
  }

  if (!next.includes('class="pbd-moved-banner"')) {
    const banner = `<div class="pbd-moved-banner" role="note" aria-label="Canonical tool location"><div class="pbd-moved-inner"><span>This tool is now officially maintained at <strong>${moved.host}</strong>.</span><a href="${moved.movedTo}" rel="noopener">Open on ${moved.host} ↗</a></div></div>`;
    if (/<\/header>/i.test(next)) {
      next = next.replace(/<\/header>/i, `</header>\n  ${banner}`);
    } else if (/<body\b[^>]*>/i.test(next)) {
      next = next.replace(/<body\b[^>]*>/i, (m) => `${m}\n  ${banner}`);
    }
  }

  return next;
}

/* ========================================================================== *
 * Zero-Dependency Minifiers (CSS, JS Lexer, Protected-Block HTML + JSON-LD)  *
 * ========================================================================== */

/**
 * Calc-safe, string-safe, url()-safe CSS minifier.
 * Strips comments and redundant whitespace while preserving spaces inside
 * strings, url(...), calc(...) math operators, and media query keywords.
 */
function minifyCss(css) {
  if (!css) return "";
  let out = "";
  let i = 0;
  const len = css.length;
  let pendingSpace = false;

  const isSpace = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f";
  const lastOut = () => (out.length ? out[out.length - 1] : "");

  while (i < len) {
    const ch = css[i];

    // Block comments /* ... */
    if (ch === "/" && css[i + 1] === "*") {
      i += 2;
      while (i < len && !(css[i] === "*" && css[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // Quoted strings '...' or "..."
    if (ch === '"' || ch === "'") {
      if (pendingSpace) {
        const prev = lastOut();
        if (prev && !"{};,:(".includes(prev)) out += " ";
        pendingSpace = false;
      }
      const quote = ch;
      out += ch;
      i++;
      while (i < len) {
        const c = css[i];
        out += c;
        i++;
        if (c === "\\" && i < len) {
          out += css[i];
          i++;
        } else if (c === quote) {
          break;
        }
      }
      continue;
    }

    // url(...) — preserve inner URL verbatim
    if (
      (ch === "u" || ch === "U") &&
      css.slice(i, i + 4).toLowerCase() === "url("
    ) {
      if (pendingSpace) {
        const prev = lastOut();
        if (prev && !"{};,:(".includes(prev)) out += " ";
        pendingSpace = false;
      }
      out += "url(";
      i += 4;
      while (i < len && isSpace(css[i])) i++;
      if (css[i] === '"' || css[i] === "'") {
        const q = css[i];
        out += q;
        i++;
        while (i < len) {
          const c = css[i];
          out += c;
          i++;
          if (c === "\\" && i < len) {
            out += css[i];
            i++;
          } else if (c === q) {
            break;
          }
        }
        while (i < len && isSpace(css[i])) i++;
        if (css[i] === ")") {
          out += ")";
          i++;
        }
      } else {
        let rawUrl = "";
        while (i < len && css[i] !== ")") {
          rawUrl += css[i];
          i++;
        }
        out += rawUrl.trim();
        if (css[i] === ")") {
          out += ")";
          i++;
        }
      }
      continue;
    }

    // Whitespace runs
    if (isSpace(ch)) {
      pendingSpace = true;
      while (i < len && isSpace(css[i])) i++;
      continue;
    }

    // Structural punctuation where surrounding/preceding spaces are safely removable
    if (ch === "{" || ch === "}" || ch === ";" || ch === ",") {
      pendingSpace = false;
      // Drop redundant semicolon right before '}'
      if (ch === "}" && lastOut() === ";") {
        out = out.slice(0, -1);
      }
      out += ch;
      i++;
      continue;
    }

    if (ch === ")") {
      pendingSpace = false;
      out += ch;
      i++;
      continue;
    }

    if (ch === "(") {
      // Preserve space before '(' after media/supports keywords like `and (`, `not (`, `or (`
      if (pendingSpace) {
        const prev = lastOut();
        if (prev && /[A-Za-z0-9_-]/.test(prev)) out += " ";
        pendingSpace = false;
      }
      out += ch;
      i++;
      continue;
    }

    if (ch === ":") {
      // Keep space before ':' if it might be a descendant pseudo-selector (e.g. `div :focus`)
      if (pendingSpace) {
        const prev = lastOut();
        if (prev && /[A-Za-z0-9_.*\]\)]/.test(prev)) {
          // Only keep space if we're likely in a selector (last '{' or '}' or ';' check)
          const lastOpen = out.lastIndexOf("{");
          const lastClose = out.lastIndexOf("}");
          const inBlock = lastOpen > lastClose;
          if (!inBlock) out += " ";
        }
        pendingSpace = false;
      }
      out += ch;
      i++;
      continue;
    }

    if (pendingSpace) {
      const prev = lastOut();
      if (prev && !"{};,:(".includes(prev)) {
        out += " ";
      }
      pendingSpace = false;
    }

    out += ch;
    i++;
  }

  return out.trim();
}

/* ---- Lexer-Driven, Regex/Template/ASI-Safe JavaScript Minifier ---- */

const JS_REGEX_PRECEDING_KW = new Set([
  "return", "case", "throw", "typeof", "void", "delete",
  "in", "instanceof", "new", "of", "else", "do", "yield", "await",
]);

const JS_NO_ASI_AFTER_PUNCT = new Set([
  "(", "[", "{", ",", ";", ":", "?", "=",
  "==", "!=", "===", "!==", "<", ">", "<=", ">=",
  "&&", "||", "??", "=>", ".", "?.",
  "+", "-", "*", "/", "%", "**",
  "&", "|", "^", "~", "!",
  "+=", "-=", "*=", "/=", "%=", "**=",
  "<<", ">>", ">>>", "<<=", ">>=", ">>>=",
  "&=", "|=", "^=", "&&=", "||=", "??=", "...",
]);

const JS_RESTRICTED_NEWLINE_KW = new Set([
  "return", "throw", "break", "continue", "yield",
]);

const JS_MULTI_OPS = [
  ">>>=", "===", "!==", ">>>", "**=", "&&=", "||=", "??=", "<<=", ">>=", "...",
  "==", "!=", "<=", ">=", "&&", "||", "??", "=>", "++", "--", "**",
  "<<", ">>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "?.",
];

function isJsWordChar(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 36 || // $
    code === 95 || // _
    code > 127 // Unicode identifiers
  );
}

function canPrecedeRegex(prev) {
  if (!prev) return true;
  if (prev.type === "ident" && JS_REGEX_PRECEDING_KW.has(prev.value)) return true;
  if (prev.type === "punct") {
    return (
      prev.value !== ")" &&
      prev.value !== "]" &&
      prev.value !== "++" &&
      prev.value !== "--"
    );
  }
  return false;
}

/**
 * Tokenizes JS cleanly (handling strings, nested template literals, regexes,
 * line/block comments) and re-emits compact, ASI-safe JavaScript.
 */
function minifyJsCore(code) {
  const len = code.length;
  let i = 0;
  let out = "";
  let prev = null; // { type, value }
  let hadNewline = false;
  // Stack tracking `${ ... }` brace nesting inside template literals
  const tplBraceStack = [];

  function emit(tok) {
    if (prev) {
      let sep = "";
      const pVal = prev.value;
      const cVal = tok.value;

      if (hadNewline) {
        const mustKeepNewline =
          (prev.type === "ident" && JS_RESTRICTED_NEWLINE_KW.has(pVal)) ||
          (cVal === "++" || cVal === "--") ||
          !(
            (prev.type === "punct" && JS_NO_ASI_AFTER_PUNCT.has(pVal)) ||
            (tok.type === "punct" && (cVal === "}" || cVal === ")" || cVal === "]" || cVal === "," || cVal === ";" || cVal === "."))
          );
        if (mustKeepNewline) {
          sep = "\n";
        }
      }

      if (!sep) {
        const pLast = pVal[pVal.length - 1];
        const cFirst = cVal[0];
        if (
          (isJsWordChar(pLast) && isJsWordChar(cFirst)) ||
          (pLast === "+" && cFirst === "+") ||
          (pLast === "-" && cFirst === "-") ||
          (pLast === "/" && (cFirst === "/" || cFirst === "*")) ||
          (pLast === "<" && cVal === "!--") ||
          (pVal === "--" && cFirst === ">")
        ) {
          sep = " ";
        }
      }

      out += sep;
    }

    out += tok.value;
    prev = tok;
    hadNewline = false;
  }

  function scanTemplateChunk(startChar) {
    let raw = startChar;
    while (i < len) {
      const c = code[i];
      if (c === "\\") {
        raw += c;
        i++;
        if (i < len) {
          raw += code[i];
          i++;
        }
      } else if (c === "`") {
        raw += "`";
        i++;
        return { text: raw, opensExpr: false };
      } else if (c === "$" && code[i + 1] === "{") {
        raw += "${";
        i += 2;
        return { text: raw, opensExpr: true };
      } else {
        raw += c;
        i++;
      }
    }
    return { text: raw, opensExpr: false };
  }

  while (i < len) {
    const ch = code[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\f" || ch === "\v" || ch === "\uFEFF") {
      i++;
      continue;
    }
    if (ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
      hadNewline = true;
      i++;
      continue;
    }

    // Line comment //
    if (ch === "/" && code[i + 1] === "/") {
      i += 2;
      while (i < len && code[i] !== "\n" && code[i] !== "\r" && code[i] !== "\u2028" && code[i] !== "\u2029") {
        i++;
      }
      continue;
    }

    // Block comment /* ... */
    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < len && !(code[i] === "*" && code[i + 1] === "/")) {
        if (code[i] === "\n" || code[i] === "\r") hadNewline = true;
        i++;
      }
      i += 2;
      continue;
    }

    // String literal '...' or "..."
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let val = ch;
      i++;
      while (i < len) {
        const c = code[i];
        val += c;
        i++;
        if (c === "\\" && i < len) {
          val += code[i];
          i++;
        } else if (c === quote) {
          break;
        }
      }
      emit({ type: "string", value: val });
      continue;
    }

    // Template literal `...`
    if (ch === "`") {
      i++;
      const chunk = scanTemplateChunk("`");
      if (chunk.opensExpr) {
        emit({ type: "punct", value: chunk.text });
        tplBraceStack.push(0);
      } else {
        emit({ type: "template", value: chunk.text });
      }
      continue;
    }

    // Track braces when inside a template literal `${ ... }`
    if (ch === "{" && tplBraceStack.length > 0) {
      tplBraceStack[tplBraceStack.length - 1]++;
      emit({ type: "punct", value: "{" });
      i++;
      continue;
    }
    if (ch === "}" && tplBraceStack.length > 0) {
      if (tplBraceStack[tplBraceStack.length - 1] === 0) {
        tplBraceStack.pop();
        i++;
        const chunk = scanTemplateChunk("}");
        out += chunk.text;
        hadNewline = false;
        if (chunk.opensExpr) {
          prev = { type: "punct", value: "${" };
          tplBraceStack.push(0);
        } else {
          prev = { type: "template", value: chunk.text };
        }
        continue;
      } else {
        tplBraceStack[tplBraceStack.length - 1]--;
        emit({ type: "punct", value: "}" });
        i++;
        continue;
      }
    }

    // Regex literal /pattern/flags
    if (ch === "/" && canPrecedeRegex(prev)) {
      let val = "/";
      i++;
      let inClass = false;
      while (i < len) {
        const c = code[i];
        val += c;
        i++;
        if (c === "\\" && i < len) {
          val += code[i];
          i++;
        } else if (c === "[") {
          inClass = true;
        } else if (c === "]") {
          inClass = false;
        } else if (c === "/" && !inClass) {
          break;
        }
      }
      while (i < len && /[a-zA-Z]/.test(code[i])) {
        val += code[i];
        i++;
      }
      emit({ type: "regex", value: val });
      continue;
    }

    // Numbers (including hex, binary, scientific notation like 1e-5, decimals)
    if (
      (ch >= "0" && ch <= "9") ||
      (ch === "." && code[i + 1] >= "0" && code[i + 1] <= "9")
    ) {
      let val = "";
      if (ch === "0" && (code[i + 1] === "x" || code[i + 1] === "X" || code[i + 1] === "b" || code[i + 1] === "B" || code[i + 1] === "o" || code[i + 1] === "O")) {
        val += code[i] + code[i + 1];
        i += 2;
        while (i < len && /[0-9a-fA-F_n]/.test(code[i])) {
          val += code[i++];
        }
      } else {
        while (i < len && /[0-9_.]/.test(code[i])) {
          val += code[i++];
        }
        if (i < len && (code[i] === "e" || code[i] === "E")) {
          val += code[i++];
          if (i < len && (code[i] === "+" || code[i] === "-")) val += code[i++];
          while (i < len && /[0-9_]/.test(code[i])) val += code[i++];
        }
        if (i < len && code[i] === "n") val += code[i++];
      }
      emit({ type: "number", value: val });
      continue;
    }

    // Identifiers / keywords
    if (isJsWordChar(ch)) {
      let val = "";
      while (i < len && isJsWordChar(code[i])) {
        val += code[i++];
      }
      emit({ type: "ident", value: val });
      continue;
    }

    // Multi-char operators
    let matchedOp = null;
    for (let k = 0; k < JS_MULTI_OPS.length; k++) {
      const op = JS_MULTI_OPS[k];
      if (code.startsWith(op, i)) {
        matchedOp = op;
        break;
      }
    }
    if (matchedOp) {
      emit({ type: "punct", value: matchedOp });
      i += matchedOp.length;
      continue;
    }

    // Single-char punctuation
    emit({ type: "punct", value: ch });
    i++;
  }

  return out;
}

const verificationStats = { jsValidated: 0, jsonLdValidated: 0 };

function minifyJs(code, label) {
  if (!code || !code.trim()) return "";
  const minified = minifyJsCore(code);
  try {
    new vm.Script(minified, { filename: label });
    verificationStats.jsValidated++;
  } catch (err) {
    throw new Error(`JS syntax verification failed after minifying ${label}: ${err.message}`);
  }
  return minified;
}

const HTML_BLOCK_TAGS =
  "(?:html|head|body|meta|link|title|base|header|footer|main|nav|section|article|aside|div|p|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|h[1-6]|form|fieldset|legend|details|summary|hr|br|option|select|optgroup|script|style|noscript|figure|figcaption|blockquote|dl|dt|dd|template)";
const RE_SPACE_BEFORE_BLOCK = new RegExp(`>\\s+(?=<\\/?${HTML_BLOCK_TAGS}\\b)`, "gi");
const RE_SPACE_AFTER_BLOCK = new RegExp(`(<\\/?${HTML_BLOCK_TAGS}\\b[^>]*>)\\s+(?=<)`, "gi");

/**
 * Protected-block HTML minifier:
 * - Preserves <pre>, <textarea>, <code> verbatim
 * - Minifies inline <style>, inline <script>, and JSON-LD blocks
 * - Strips non-conditional HTML comments & collapses inter-tag block whitespace
 */
function minifyHtml(html, relPath) {
  if (!html) return "";
  const holds = [];
  const hold = (content) => {
    const idx = holds.length;
    holds.push(content);
    return `\u0000PBD_HOLD_${idx}\u0000`;
  };

  let work = html;

  // 1. Protect <pre>, <textarea>, <code> verbatim
  work = work.replace(/<(pre|textarea|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => hold(m));

  // 2. Extract and minify <style> blocks
  work = work.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_m, open, body, close) => {
    return hold(open + minifyCss(body) + close);
  });

  // 3. Extract and minify <script> blocks
  let inlineIdx = 0;
  work = work.replace(/(<script\b([^>]*)>)([\s\S]*?)(<\/script\s*>)/gi, (full, open, attrs, body, close) => {
    const hasSrc = /\bsrc\s*=/i.test(attrs);
    if (hasSrc || !body.trim()) {
      return hold(full.replace(/>\s+<\/script/i, "></script"));
    }

    const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const scriptType = typeMatch ? (typeMatch[1] || typeMatch[2] || typeMatch[3] || "").trim().toLowerCase() : "";

    if (scriptType === "application/ld+json") {
      try {
        const compact = JSON.stringify(JSON.parse(body)).replace(/<\/script/gi, "<\\/script");
        verificationStats.jsonLdValidated++;
        return hold(open + compact + close);
      } catch (err) {
        throw new Error(`Invalid JSON-LD in ${relPath}: ${err.message}`);
      }
    }

    if (scriptType && scriptType !== "text/javascript" && scriptType !== "application/javascript") {
      return hold(full);
    }

    inlineIdx++;
    const minified = minifyJs(body, `${relPath}#inline-script-${inlineIdx}`);
    return hold(open + minified + close);
  });

  // 4. Strip non-conditional HTML comments
  work = work.replace(/<!--(?!\s*\[if\b)[\s\S]*?-->/g, "");

  // 5. Collapse whitespace runs and trim whitespace around block-level tags
  work = work.replace(/\s+/g, " ");
  work = work.replace(RE_SPACE_BEFORE_BLOCK, ">");
  work = work.replace(RE_SPACE_AFTER_BLOCK, "$1");
  work = work.replace(/<!doctype\s+html>\s+/i, "<!doctype html>");
  work = work.trim();

  // 6. Restore protected blocks (loop handles any nested code inside pre)
  work = work.replace(/\u0000PBD_HOLD_(\d+)\u0000/g, (_m, idx) => holds[Number(idx)]);

  return work;
}

/* ========================================================================== *
 * HTML Compilation Pipeline                                                  *
 * ========================================================================== */

function compileHtml(rawHtml, rel) {
  let html = rawHtml;
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
    html = injectFeaturedGrid(html, "featured-tools", TOOLS);
    html = injectFeaturedGrid(html, "featured-widgets", WIDGETS);
    html = injectFeaturedGrid(html, "featured-guides", GUIDES);
    html = injectFeaturedBySection(html, "featured", TOOLS);
    html = injectFeaturedByHeading(html, "Widgets", WIDGETS);
    html = injectFeaturedByHeading(html, "Guides", GUIDES);
  }

  html = ensureRobotsMeta(html, rel);
  html = ensureCanonical(html, rel);
  html = ensureOgUrl(html, rel);
  html = alignJsonLdMovedUrls(html, rel);
  html = rewriteMovedAnchors(html, rel);
  html = injectMovedNotice(html, rel);

  const ads = ensureAdSense(html, rel);
  html = ads.html;
  if (ads.fixed) {
    adsenseNote = ads.status;
  }

  const compiledBytes = Buffer.byteLength(html, "utf8");
  const minified = isRealHtml(html) ? minifyHtml(html, rel) : html;
  const outputBytes = Buffer.byteLength(minified, "utf8");

  return {
    output: minified,
    adsense: ads.status,
    adsenseFixed: ads.fixed,
    adsenseNote,
    compiledBytes,
    outputBytes,
  };
}

function generateSitemap() {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    { loc: `${SITE_ORIGIN}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: `${SITE_ORIGIN}/guides/`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: `${SITE_ORIGIN}/widgets/`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: `${SITE_ORIGIN}/about/`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${SITE_ORIGIN}/privacy/`, changefreq: "monthly", priority: "0.4", lastmod: today },
  ];

  for (const w of WIDGETS) {
    if (w.href && !w.movedTo) {
      urls.push({
        loc: `${SITE_ORIGIN}${w.href}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: today,
      });
    }
  }

  for (const g of GUIDES) {
    if (g.href && !g.movedTo) {
      urls.push({
        loc: `${SITE_ORIGIN}${g.href}`,
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

  const sitemapPath = path.join(OUT_ROOT, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`Generated public/sitemap.xml with ${urls.length} URLs (lastmod: ${today}).`);
  return urls;
}

function verifySeoInvariants(sitemapUrls, compiledHtmlByRel) {
  const errors = [];
  const sitemapSet = new Set(sitemapUrls.map((u) => u.loc));

  for (const u of sitemapUrls) {
    if (/\/tools(?:\/|$)/i.test(u.loc)) {
      errors.push(`sitemap.xml must not include /tools/ URL: ${u.loc}`);
    }
  }

  for (const [rel, entry] of MOVED_BY_REL.entries()) {
    const html = compiledHtmlByRel.get(rel);
    if (!html) {
      errors.push(`Moved page missing from build output: ${rel}`);
      continue;
    }

    const canMatch = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
    if (!canMatch || canMatch[1] !== entry.movedTo) {
      errors.push(`${rel}: canonical expected "${entry.movedTo}", got "${canMatch ? canMatch[1] : "NONE"}"`);
    }

    const ogMatch = html.match(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/i);
    if (!ogMatch || ogMatch[1] !== entry.movedTo) {
      errors.push(`${rel}: og:url expected "${entry.movedTo}", got "${ogMatch ? ogMatch[1] : "NONE"}"`);
    }

    const robMatch = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/i);
    if (!robMatch || /\bnoindex\b/i.test(robMatch[1])) {
      errors.push(`${rel}: robots meta must be indexable alongside cross-domain canonical (got "${robMatch ? robMatch[1] : "NONE"}")`);
    }

    if (sitemapSet.has(`${SITE_ORIGIN}${entry.href}`)) {
      errors.push(`sitemap.xml must not include cross-domain canonicalized URL: ${SITE_ORIGIN}${entry.href}`);
    }
  }

  let strayInternalLinks = 0;
  for (const [rel, html] of compiledHtmlByRel.entries()) {
    const baseUrl = `${SITE_ORIGIN}/${rel}`;
    const anchorRe = /<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
    let m;
    while ((m = anchorRe.exec(html)) !== null) {
      const href = m[1] !== undefined ? m[1] : m[2];
      if (resolveMovedPageUrl(href, baseUrl)) {
        strayInternalLinks++;
        errors.push(`${rel}: stray internal link to moved tool "${href}"`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`SEO invariant audit failed (${errors.length} issue(s)):\n  - ${errors.join("\n  - ")}`);
  }

  console.log(
    `SEO Migration: ${MOVED_BY_REL.size} pages cross-domain canonicalized → ${MOVED_TOOLS_ORIGIN}, 0 sitemap conflicts, ${strayInternalLinks} stray internal links.`
  );
}

/* ========================================================================== *
 * Main Build Execution (Clean Rebuild: src/ -> public/)                      *
 * ========================================================================== */

function formatKB(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error("Error: src/ directory not found. Aborting to protect public/.");
    process.exit(1);
  }

  const startTime = Date.now();

  // 1. Clean output directory
  fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const srcFiles = walkAll(SRC_ROOT);
  const counts = { html: 0, css: 0, js: 0, copied: 0 };
  const bytes = { raw: 0, out: 0 };
  const adsenseStats = { ok: 0, fixed: 0, skipped: 0, brokenLeft: 0 };
  const adsenseFixedFiles = [];
  const compiledHtmlByRel = new Map();

  for (const srcFile of srcFiles) {
    const rel = path.relative(SRC_ROOT, srcFile).replace(/\\/g, "/");
    if (rel === "sitemap.xml") continue;

    const outFile = path.join(OUT_ROOT, rel);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const ext = path.extname(rel).toLowerCase();

    if (ext === ".html") {
      const raw = fs.readFileSync(srcFile, "utf8");
      const res = compileHtml(raw, rel);
      fs.writeFileSync(outFile, res.output, "utf8");
      compiledHtmlByRel.set(rel, res.output);
      counts.html++;
      bytes.raw += res.compiledBytes;
      bytes.out += res.outputBytes;

      if (res.adsense === "skip") adsenseStats.skipped++;
      else if (res.adsenseFixed) {
        adsenseStats.fixed++;
        adsenseFixedFiles.push(rel);
      } else if (res.adsense === "ok") adsenseStats.ok++;
      else adsenseStats.brokenLeft++;
    } else if (ext === ".css") {
      const raw = fs.readFileSync(srcFile, "utf8");
      const min = minifyCss(raw);
      fs.writeFileSync(outFile, min, "utf8");
      counts.css++;
      bytes.raw += Buffer.byteLength(raw, "utf8");
      bytes.out += Buffer.byteLength(min, "utf8");
    } else if (ext === ".js") {
      const raw = fs.readFileSync(srcFile, "utf8");
      const min = minifyJs(raw, rel);
      fs.writeFileSync(outFile, min, "utf8");
      counts.js++;
      bytes.raw += Buffer.byteLength(raw, "utf8");
      bytes.out += Buffer.byteLength(min, "utf8");
    } else {
      fs.copyFileSync(srcFile, outFile);
      counts.copied++;
    }
  }

  const sitemapUrls = generateSitemap();
  verifySeoInvariants(sitemapUrls, compiledHtmlByRel);

  const saved = bytes.raw - bytes.out;
  const pct = bytes.raw ? ((saved / bytes.raw) * 100).toFixed(1) : "0.0";
  const elapsed = Date.now() - startTime;

  console.log(
    `Built public/ from src/ in ${elapsed}ms: ${counts.html} HTML, ${counts.css} CSS, ${counts.js} JS, ${counts.copied} static files copied.`
  );
  console.log(
    `Minified text assets: ${formatKB(bytes.raw)} → ${formatKB(bytes.out)} (saved ${formatKB(saved)}, ${pct}%).`
  );
  console.log(
    `Verified: ${verificationStats.jsValidated} JS scripts/blocks (vm.Script), ${verificationStats.jsonLdValidated} JSON-LD blocks (JSON.parse).`
  );
  console.log(
    `AdSense: ${adsenseStats.ok} OK, ${adsenseStats.fixed} fixed, ${adsenseStats.skipped} skipped` +
      (adsenseStats.brokenLeft ? `, ${adsenseStats.brokenLeft} still broken` : "")
  );
  if (adsenseFixedFiles.length) {
    console.log("  fixed:", adsenseFixedFiles.join(", "));
  }
}

main();
