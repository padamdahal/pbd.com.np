/**
 * menubuilder.cjs — injects static header + footer nav into all pages.
 * Run:  node menubuilder.cjs
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");

const HEADER_NAV = `<nav id="menu" class="site-nav" aria-label="Main navigation" role="navigation"><a href="/">Home</a><a href="/#tools">Tools</a><a href="/#widgets">Widgets</a><a href="/#guides">Guides</a><a href="/about/">About</a></nav>`;

const FOOTER_NAV = `<nav id="footer-menu" class="footer-pills" aria-label="Footer"><a href="/#tools">Tools</a><a href="/#widgets">Widgets</a><a href="/#guides">Guides</a><a href="/tools/nepali-typing/">Nepali Typing</a><a href="/tools/preeti-to-unicode/">Preeti ↔ Unicode</a><a href="/tools/income-tax-calculator/">Income Tax</a><a href="/tools/nepal-map/">Nepal Map</a></nav>`;

const FOOTER_BLOCK = `<footer class="site-footer">
  <div class="bar footer-bar">
    ${FOOTER_NAV}
    <div class="footer-meta">
      <p class="footer-copy">© <span id="yr"></span> Powered By Digital (PBD)</p>
      <nav class="footer-legal" aria-label="Legal"><a href="/about/">About</a><a href="/privacy/">Privacy</a></nav>
    </div>
  </div>
</footer>`;

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

  html = html.replace(
    /<nav\b[^>]*\bid=["']menu["'][^>]*>[\s\S]*?<\/nav>/i,
    HEADER_NAV
  );

  if (/<footer\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i.test(html)) {
    html = html.replace(
      /<footer\b[^>]*class=["'][^"']*site-footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i,
      FOOTER_BLOCK
    );
  } else {
    html = html.replace(
      /<nav\b[^>]*\bid=["']footer-menu["'][^>]*>[\s\S]*?<\/nav>/i,
      FOOTER_NAV
    );
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
