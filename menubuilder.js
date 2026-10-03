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

const meta = (html, name) => {
  const needle = 'name="' + name + '"';
  const needle2 = "name='" + name + "'";
  let i = html.toLowerCase().indexOf("<meta");
  while (i >= 0) {
    const end = html.indexOf(">", i);
    if (end < 0) break;
    const tag = html.slice(i, end + 1);
    if (tag.includes(needle) || tag.includes(needle2)) {
      const cm = /content\s*=\s*["']([^"']*)["']/i.exec(tag);
      if (cm) return cm[1];
    }
    i = html.toLowerCase().indexOf("<meta", end + 1);
  }
  return undefined;
};

const isNoindex = (html) =>
  /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

const isoDate = (filePath) => {
  try {
    const g = execSync('git log -1 --format=%cs -- "' + filePath + '"', {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (g) return g;
  } catch {}
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

// Entity escape via concatenation — avoids broken quotes if the file is re-encoded.
const ENT = {
  "&": "&" + "amp;",
  "<": "&" + "lt;",
  ">": "&" + "gt;",
  '"': "&" + "quot;",
  "'": "&" + "apos;",
};
const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => ENT[c]);
const escapeHtml = (s) => escapeXml(s);

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
      loc: siteUrl + "/",
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
  const pagePath = "/" + d.name + "/";
  const hideFromMenu = /<meta\s+name=["']menu-hide["']\s+content=["']true["']/i.test(html);

  if (!hideFromMenu) {
    const titleMatch = /<title>(.*?)<\/title>/i.exec(html);
    const item = {
      title: meta(html, "menu-title") ?? (titleMatch && titleMatch[1]) ?? d.name,
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
    sitemapEntries.push({
      loc: siteUrl + pagePath,
      lastmod: isoDate(filePath),
      changefreq: hideFromMenu ? "monthly" : "weekly",
      priority: hideFromMenu ? "0.5" : "0.8",
    });
  }
}

for (const cat of categoriesMap.values()) cat.items.sort((a, b) => a.title.localeCompare(b.title));
topItems.sort((a, b) => a.title.localeCompare(b.title));
sitemapEntries.sort((a, b) => {
  if (a.loc === siteUrl + "/") return -1;
  if (b.loc === siteUrl + "/") return 1;
  return a.loc.localeCompare(b.loc);
});

const categories = CATEGORY_ORDER.filter((k) => categoriesMap.has(k))
  .map((k) => categoriesMap.get(k))
  .concat([...categoriesMap.values()].filter((c) => !CATEGORY_ORDER.includes(c.key)));
const menuData = { categories, top: topItems };
fs.writeFileSync(path.join(root, "menu.json"), JSON.stringify(menuData, null, 2) + "\n");
const totalItems = categories.reduce((n, c) => n + c.items.length, 0) + topItems.length;
console.log(
  "menu.json: " +
    categories.length +
    " categor" +
    (categories.length === 1 ? "y" : "ies") +
    ", " +
    totalItems +
    " page(s)"
);

const caret = "\u25BE";

const headerInner = (() => {
  const parts = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    const links = cat.items
      .map(
        (it) =>
          '<a href="' + escapeHtml(it.path) + '" role="menuitem">' + escapeHtml(it.title) + "</a>"
      )
      .join("");
    parts.push(
      '<div class="nav-item"><button type="button" class="nav-link" aria-haspopup="true" aria-expanded="false">' +
        escapeHtml(cat.label) +
        ' <span class="nav-caret" aria-hidden="true">' +
        caret +
        '</span></button><div class="submenu" role="menu">' +
        links +
        "</div></div>"
    );
  }
  for (const it of topItems) {
    parts.push(
      '<div class="nav-item"><a href="' + escapeHtml(it.path) + '">' + escapeHtml(it.title) + "</a></div>"
    );
  }
  return parts.join("");
})();

const footerInner = (() => {
  const parts = [];
  for (const cat of categories) {
    if (!cat.items.length) continue;
    const links = cat.items
      .map((it) => '<a href="' + escapeHtml(it.path) + '">' + escapeHtml(it.title) + "</a>")
      .join("");
    parts.push(
      '<div class="footer-group"><span class="footer-group-label">' +
        escapeHtml(cat.label) +
        '</span><div class="footer-group-links">' +
        links +
        "</div></div>"
    );
  }
  if (topItems.length) {
    const links = topItems
      .map((it) => '<a href="' + escapeHtml(it.path) + '">' + escapeHtml(it.title) + "</a>")
      .join("");
    parts.push('<div class="footer-group"><div class="footer-group-links">' + links + "</div></div>");
  }
  return parts.join("");
})();

function withClassAndRole(attrs, className, role) {
  let a = attrs || "";
  if (/\bclass\s*=/.test(a)) {
    a = a.replace(/class\s*=\s*(["'])([^"']*)\1/i, (m, q, val) => {
      const tokens = val.split(/\s+/).filter(Boolean);
      if (!tokens.includes(className)) tokens.push(className);
      return "class=" + q + tokens.join(" ") + q;
    });
  } else {
    a += ' class="' + className + '"';
  }
  if (role && !/\brole\s*=/.test(a)) a += ' role="' + role + '"';
  return a;
}

function replaceNavContent(html, id, inner, opts) {
  const className = opts && opts.className;
  const role = opts && opts.role;
  const markers = ['id="' + id + '"', "id='" + id + "'"];
  for (let mi = 0; mi < markers.length; mi++) {
    const marker = markers[mi];
    const idPos = html.indexOf(marker);
    if (idPos < 0) continue;
    const navStart = html.lastIndexOf("<nav", idPos);
    if (navStart < 0) continue;
    const tagEnd = html.indexOf(">", idPos);
    if (tagEnd < 0) continue;
    if (html.slice(navStart, tagEnd + 1).indexOf(marker) < 0) continue;
    const close = "</nav>";
    const navEnd = html.indexOf(close, tagEnd);
    if (navEnd < 0) continue;
    let attrs = html.slice(navStart + 4, tagEnd);
    if (className) attrs = withClassAndRole(attrs, className, role);
    const replacement = "<nav" + attrs + ">" + inner + close;
    return {
      html: html.slice(0, navStart) + replacement + html.slice(navEnd + close.length),
      changed: true,
    };
  }
  return { html: html, changed: false };
}

let pagesUpdated = 0;
for (let fi = 0; fi < htmlFiles.length; fi++) {
  const filePath = htmlFiles[fi];
  let html = fs.readFileSync(filePath, "utf8");
  const before = html;
  let r = replaceNavContent(html, "menu", headerInner, {
    className: "site-nav",
    role: "navigation",
  });
  html = r.html;
  r = replaceNavContent(html, "footer-menu", footerInner, {});
  html = r.html;
  if (html !== before) {
    fs.writeFileSync(filePath, html);
    pagesUpdated++;
  }
}
console.log("nav HTML: injected into " + pagesUpdated + " page(s) (#menu + #footer-menu)");

const urlNodes = sitemapEntries
  .map(function (e) {
    return (
      "  <url>\n    <loc>" +
      escapeXml(e.loc) +
      "</loc>\n    <lastmod>" +
      e.lastmod +
      "</lastmod>\n    <changefreq>" +
      e.changefreq +
      "</changefreq>\n    <priority>" +
      e.priority +
      "</priority>\n  </url>"
    );
  })
  .join("\n");

const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urlNodes +
  "\n</urlset>\n";

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
console.log("sitemap.xml: " + sitemapEntries.length + " URL(s) -> " + siteUrl);

const robots =
  "User-agent: *\nAllow: /\n\nSitemap: " + siteUrl + "/sitemap.xml\n";

fs.writeFileSync(path.join(root, "robots.txt"), robots);
console.log("robots.txt: Sitemap -> " + siteUrl + "/sitemap.xml");
