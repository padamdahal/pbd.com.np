/************** Updates the following files ***********************
public/menu.json        - tools nav + categories
public/sitemap.xml      - SEO sitemap (all indexable pages)
public/robots.txt       - points crawlers at the sitemap
public index.html pages - injects real anchors into #menu and #footer-menu
******************************************************************/
/************ Check the following in each pages ******************
<meta name="menu-title" content="Number to Nepali words">
<meta name="description" content="Short one-line description">
******************************************************************/

/*********** Ignores the pages with the following *****************
<meta name="menu-hide" content="true">
<meta name="robots" content="noindex, ...">  (still gets nav links; omitted from sitemap)
******************************************************************/

/******************* Update before deploy ***********************
SITE_URL=https://pbd.com.np npm run deploy
or edit DEFAULT_SITE_URL below (defaults to production).
*****************************************************************/

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = "public";
const DEFAULT_SITE_URL = "https://pbd.com.np";
const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

const meta = (html, name) =>
  html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"))?.[1];

const isNoindex = (html) =>
  /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

const isoDate = (filePath) => {
  try {
    const g = execSync(`git log -1 --format=%cs -- "${filePath}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (g) return g;
  } catch {}
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const escapeXml = (s) => {
  const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&" + "apos;" };
  return String(s).replace(/[&<>"']/g, (c) => map[c]);
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);

// --- collect pages ---
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (!d.isDirectory()) return [];
    const rel = path.join(dir, d.name);
    const here = fs.existsSync(path.join(rel, "index.html")) ? [rel] : [];
    return [...here, ...walk(rel)];
  });
const dirs = walk(root).map((p) => ({ name: path.relative(root, p).split(path.sep).join("/") }));

const CATEGORY_LABELS = { tools: "Tools", guides: "Guides" };
const CATEGORY_ORDER = ["tools", "guides"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const categoriesMap = new Map();
const topItems = [];
const sitemapEntries = [];
const htmlFiles = [];

const homePath = path.join(root, "index.html");
if (fs.existsSync(homePath)) {
  htmlFiles.push(homePath);
  const homeHtml = fs.readFileSync(homePath, "utf8");
  if (!isNoindex(homeHtml)) {
    sitemapEntries.push({
      loc: `${siteUrl}/`,
      lastmod: isoDate(homePath),
      changefreq: "weekly",
      priority: "1.0",
    });
  }
}

for (const d of dirs) {
  const filePath = path.join(root, d.name, "index.html");
  htmlFiles.push(filePath);
  const html = fs.readFileSync(filePath, "utf8");
  const pagePath = `/${d.name}/`;
  const hideFromMenu = /<meta\s+name=["']menu-hide["']\s+content=["']true["']/i.test(html);

  if (!hideFromMenu) {
    const item = {
      title: meta(html, "menu-title") ?? html.match(/<title>(.*?)<\/title>/i)?.[1] ?? d.name,
      description: meta(html, "description") ?? "",
      path: pagePath,
    };
    const segments = d.name.split("/");
    if (segments.length > 1) {
      const key = segments[0];
      if (!categoriesMap.has(key)) {
        categoriesMap.set(key, { key, label: CATEGORY_LABELS[key] ?? cap(key), items: [] });
      }
      categoriesMap.get(key).items.push(item);
    } else {
      topItems.push(item);
    }
  }

  if (!isNoindex(html)) {
    const priority = hideFromMenu ? "0.5" : "0.8";
    const changefreq = hideFromMenu ? "monthly" : "weekly";
    sitemapEntries.push({
      loc: `${siteUrl}${pagePath}`,
      lastmod: isoDate(filePath),
      changefreq,
      priority,
    });
  }
}

for (const cat of categoriesMap.values()) cat.items.sort((a, b) => a.title.localeCompare(b.title));
topItems.sort((a, b) => a.title.localeCompare(b.title));
sitemapEntries.sort((a, b) => {
  if (a.loc === `${siteUrl}/`) return -1;
  if (b.loc === `${siteUrl}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

const categories = CATEGORY_ORDER.filter((k) => categoriesMap.has(k))
  .map((k) => categoriesMap.get(k))
  .concat([...categoriesMap.values()].filter((c) => !CATEGORY_ORDER.includes(c.key)));
const menuData = { categories, top: topItems };
fs.writeFileSync(path.join(root, "menu.json"), JSON.stringify(menuData, null, 2) + "\n");
const totalItems = categories.reduce((n, c) => n + c.items.length, 0) + topItems.length;
console.log(`menu.json: ${categories.length} categor${categories.length === 1 ? "y" : "ies"}, ${totalItems} page(s)`);

const caret = "\u25BE";

const headerInner = (() => {
  const parts = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    const links = cat.items
      .map((it) => `<a href="${escapeHtml(it.path)}" role="menuitem">${escapeHtml(it.title)}</a>`)
      .join("");
    parts.push(
      `<div class="nav-item"><button type="button" class="nav-link" aria-haspopup="true" aria-expanded="false">${escapeHtml(cat.label)} <span class="nav-caret" aria-hidden="true">${caret}</span></button><div class="submenu" role="menu">${links}</div></div>`
    );
  }
  for (const it of topItems) {
    parts.push(`<div class="nav-item"><a href="${escapeHtml(it.path)}">${escapeHtml(it.title)}</a></div>`);
  }
  return parts.join("");
})();

const footerInner = (() => {
  const parts = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    const links = cat.items
      .map((it) => `<a href="${escapeHtml(it.path)}">${escapeHtml(it.title)}</a>`)
      .join("");
    parts.push(
      `<div class="footer-group"><span class="footer-group-label">${escapeHtml(cat.label)}</span><div class="footer-group-links">${links}</div></div>`
    );
  }
  if (topItems.length) {
    const links = topItems
      .map((it) => `<a href="${escapeHtml(it.path)}">${escapeHtml(it.title)}</a>`)
      .join("");
    parts.push(`<div class="footer-group"><div class="footer-group-links">${links}</div></div>`);
  }
  return parts.join("");
})();

function withClassAndRole(attrs, className, role) {
  let a = attrs || "";
  if (/\bclass\s*=/.test(a)) {
    a = a.replace(/class\s*=\s*(["'])([^"']*)\1/i, (m, q, val) => {
      const tokens = val.split(/\s+/).filter(Boolean);
      if (!tokens.includes(className)) tokens.push(className);
      return `class=${q}${tokens.join(" ")}${q}`;
    });
  } else {
    a += ` class="${className}"`;
  }
  if (role && !/\brole\s*=/.test(a)) a += ` role="${role}"`;
  return a;
}

function replaceNavContent(html, id, inner, { className, role } = {}) {
  const re = new RegExp(`<nav(\\s[^>]*\\bid=["']${id}["'][^>]*)>([\\s\\S]*?)<\\/nav>`, "i");
  if (!re.test(html)) return { html, changed: false };
  const next = html.replace(re, (_, attrs) => {
    const a = className ? withClassAndRole(attrs, className, role) : attrs;
    return `<nav${a}>${inner}</nav>`;
  });
  return { html: next, changed: next !== html };
}

let pagesUpdated = 0;
for (const filePath of htmlFiles) {
  let html = fs.readFileSync(filePath, "utf8");
  const before = html;
  let r = replaceNavContent(html, "menu", headerInner, {
    className: "site-nav",
    role: "navigation",
  });
  html = r.html;
  r = replaceNavContent(html, "footer-menu", footerInner);
  html = r.html;
  if (html !== before) {
    fs.writeFileSync(filePath, html);
    pagesUpdated++;
  }
}
console.log(`nav HTML: injected into ${pagesUpdated} page(s) (#menu + #footer-menu)`);

const urlNodes = sitemapEntries
  .map(
    (e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>\n`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
console.log(`sitemap.xml: ${sitemapEntries.length} URL(s) -> ${siteUrl}`);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

fs.writeFileSync(path.join(root, "robots.txt"), robots);
console.log(`robots.txt: Sitemap -> ${siteUrl}/sitemap.xml`);
