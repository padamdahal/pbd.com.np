/************** Updates the following files ***********************
public/menu.json   — tools nav + home cards
public/sitemap.xml — SEO sitemap (all indexable pages)
public/robots.txt  — points crawlers at the sitemap
******************************************************************/
/************ Check the following in each pages ******************
<meta name="menu-title" content="Number to Nepali words">
<meta name="description" content="Short one-line description">
******************************************************************/

/*********** Ignores the pages with the following *****************
<meta name="menu-hide" content="true">
<meta name="robots" content="noindex, …">
******************************************************************/

/******************* Update before deploy ***********************
SITE_URL=https://pbd.com.np npm run deploy
or edit DEFAULT_SITE_URL below (defaults to production).
*****************************************************************/

import fs from "node:fs";
import path from "node:path";

const root = "public";
const DEFAULT_SITE_URL = "https://pbd.com.np";
const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

const meta = (html, name) =>
  html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"))?.[1];

const isNoindex = (html) =>
  /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

import { execSync } from "node:child_process";
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

const categoriesMap = new Map(); // key -> { key, label, items: [] }
const topItems = [];
const sitemapEntries = [];

// Home page
const homePath = path.join(root, "index.html");
if (fs.existsSync(homePath)) {
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
      // Nested page (e.g. tools/nepali-typing) → grouped under its first
      // path segment as a submenu category. A new category (e.g. guides/*)
      // appears automatically once its first page exists — no code change needed.
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
// Home first, then tools by path, then the rest
sitemapEntries.sort((a, b) => {
  if (a.loc === `${siteUrl}/`) return -1;
  if (b.loc === `${siteUrl}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

// --- menu.json ---
// { categories: [{ key, label, items:[{title,description,path}] }], top: [{title,description,path}] }
// A category is only present once it has at least one page, so e.g. "Guides"
// appears in the nav automatically the first time a public/guides/*/index.html exists.
const categories = CATEGORY_ORDER.filter((k) => categoriesMap.has(k))
  .map((k) => categoriesMap.get(k))
  .concat([...categoriesMap.values()].filter((c) => !CATEGORY_ORDER.includes(c.key)));
const menuData = { categories, top: topItems };
fs.writeFileSync(path.join(root, "menu.json"), JSON.stringify(menuData, null, 2) + "\n");
const totalItems = categories.reduce((n, c) => n + c.items.length, 0) + topItems.length;
console.log(`menu.json: ${categories.length} categor${categories.length === 1 ? "y" : "ies"}, ${totalItems} page(s)`);

// --- sitemap.xml ---
const urlNodes = sitemapEntries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
console.log(`sitemap.xml: ${sitemapEntries.length} URL(s) → ${siteUrl}`);

// --- robots.txt ---
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(root, "robots.txt"), robots);
console.log(`robots.txt: Sitemap → ${siteUrl}/sitemap.xml`);
