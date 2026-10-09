(() => {
  "use strict";

  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const here = location.pathname.replace(/index\.html$/, "") || "/";

  const HEADER_LINKS = [
    { href: "/", label: "Home" },
    { href: "/#tools", label: "Tools" },
    { href: "/#widgets", label: "Widgets" },
    { href: "/#guides", label: "Guides" },
    { href: "/about/", label: "About" },
  ];

  const FOOTER_BROWSE = [
    { href: "/#tools", label: "Tools" },
    { href: "/#widgets", label: "Widgets" },
    { href: "/#guides", label: "Guides" },
  ];

  const FOOTER_POPULAR = [
    { href: "/tools/nepali-typing/", label: "Nepali Typing" },
    { href: "/tools/preeti-to-unicode/", label: "Preeti ↔ Unicode" },
    { href: "/tools/income-tax-calculator/", label: "Income Tax Calculator" },
    { href: "/tools/nepal-map/", label: "Nepal Map" },
  ];

  function isCurrent(href) {
    if (href === "/") return here === "/";
    if (href.startsWith("/#")) return false;
    try {
      const path = new URL(href, location.origin).pathname.replace(/index\.html$/, "");
      return path === here || (path !== "/" && here.startsWith(path));
    } catch {
      return false;
    }
  }

  function makeLink(href, label) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (isCurrent(href)) a.setAttribute("aria-current", "page");
    return a;
  }

  function injectHeader(nav) {
    if (!nav || nav.querySelector("a[href]")) return;
    nav.classList.add("site-nav");
    if (!nav.getAttribute("role")) nav.setAttribute("role", "navigation");
    for (const item of HEADER_LINKS) {
      nav.appendChild(makeLink(item.href, item.label));
    }
  }

  function injectFooter(nav) {
    if (!nav || nav.querySelector("a[href]")) return;

    const browse = document.createElement("div");
    browse.className = "footer-group";
    const browseLabel = document.createElement("span");
    browseLabel.className = "footer-group-label";
    browseLabel.textContent = "Browse";
    browse.appendChild(browseLabel);
    for (const item of FOOTER_BROWSE) browse.appendChild(makeLink(item.href, item.label));
    nav.appendChild(browse);

    const popular = document.createElement("div");
    popular.className = "footer-group";
    const popularLabel = document.createElement("span");
    popularLabel.className = "footer-group-label";
    popularLabel.textContent = "Popular";
    popular.appendChild(popularLabel);
    for (const item of FOOTER_POPULAR) popular.appendChild(makeLink(item.href, item.label));
    nav.appendChild(popular);
  }

  function markCurrent(root) {
    if (!root) return;
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (isCurrent(href)) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function wireMobileNav(nav) {
    if (!nav) return;
    nav.classList.add("site-nav");
    const toggle = document.getElementById("nav-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle("mobile-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && window.matchMedia("(max-width:640px)").matches) {
        nav.classList.remove("mobile-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && e.target !== toggle) {
        nav.classList.remove("mobile-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const header = document.getElementById("menu");
  const footer = document.getElementById("footer-menu");

  injectHeader(header);
  injectFooter(footer);
  markCurrent(header);
  markCurrent(footer);
  wireMobileNav(header);
})();
