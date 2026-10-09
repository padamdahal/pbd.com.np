/**
 * menubuilder.cjs — injects static header + footer nav into all pages.
 *
 * Run:  node menubuilder.cjs
 *
 * After the homepage redesign we use a simple static nav (no dropdowns,
 * no menu.json). This script keeps real HTML links in every page for SEO.
 * menu.js remains as a runtime fallback + mobile toggle + year.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");

const HEADER_NAV = `<nav id="menu" class="site-nav" aria-label="Main navigation" role="navigation"><a href="/">Home</a><a href="/#tools">Tools</a><a href="/#widgets">Widgets</a><a href="/#guides">Guides</a><a href="/about/">About</a></nav>`;

const FOOTER_NAV = `<nav id="footer-menu" aria-label="Footer"><div class="footer-group"><span class="footer-group-label">Browse</span><a href="/#tools">Tools</a><a href="/#widgets">Widgets</a><a href="/#guides">Guides</a></div><div class="footer-group"><span class="footer-group-label">Popular</span><a href="/tools/nepali-typing/">Nepali Typing</a><a href="/tools/preeti-to-unicode/">Preeti ↔ Unicode</a><a href="/tools/income-tax-calculator/">Income Tax Calculator</a><a href="/tools/nepal-map/">Nepal Map</a></div></nav>`;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name === "index.html" || name.endsWith(".html")) out.push(full);
  }
  return out;
}

function patchFile(file) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Replace any existing #menu nav block
  html = html.replace(
    /<nav\b[^>]*\bid=["']menu["'][^>]*>[\s\S]*?<\/nav>/i,
    HEADER_NAV
  );

  // Replace any existing #footer-menu nav block
  html = html.replace(
    /<nav\b[^>]*\bid=["']footer-menu["'][^>]*>[\s\S]*?<\/nav>/i,
    FOOTER_NAV
  );

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
