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

  const FOOTER_LINKS = [
    { href: "/#tools", label: "Tools" },
    { href: "/#widgets", label: "Widgets" },
    { href: "/#guides", label: "Guides" },
    { href: "/tools/nepali-typing/", label: "Nepali Typing" },
    { href: "/tools/preeti-to-unicode/", label: "Preeti ↔ Unicode" },
    { href: "/tools/income-tax-calculator/", label: "Income Tax" },
    { href: "/tools/nepal-map/", label: "Nepal Map" },
    { href: "/about/", label: "About" },
    { href: "/privacy/", label: "Privacy" },
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
    if (!nav) return;
    const hasLegacy = nav.querySelector(".nav-item, .submenu, .nav-link");
    const hasLinks = nav.querySelector("a[href]");
    if (hasLinks && !hasLegacy) return;
    nav.innerHTML = "";
    nav.classList.add("site-nav");
    if (!nav.getAttribute("role")) nav.setAttribute("role", "navigation");
    for (const item of HEADER_LINKS) {
      nav.appendChild(makeLink(item.href, item.label));
    }
  }

  function injectFooter(nav) {
    if (!nav) return;
    nav.innerHTML = "";
    nav.classList.add("footer-pills");
    for (const item of FOOTER_LINKS) {
      nav.appendChild(makeLink(item.href, item.label));
    }

    const bar = nav.closest(".bar") || nav.parentElement;
    if (bar) {
      bar.classList.add("footer-bar");
      const copy = bar.querySelector("p");
      if (copy && !copy.classList.contains("footer-copy")) {
        copy.classList.add("footer-copy");
        bar.appendChild(copy);
      } else if (!bar.querySelector(".footer-copy")) {
        const p = document.createElement("p");
        p.className = "footer-copy";
        p.innerHTML = '© <span id="yr">' + new Date().getFullYear() + "</span> Powered By Digital (PBD)";
        bar.appendChild(p);
      }
      bar.querySelectorAll(".legal").forEach((el) => {
        el.querySelectorAll("a[href]").forEach((a) => {
          if (![...nav.querySelectorAll("a")].some((x) => x.getAttribute("href") === a.getAttribute("href"))) {
            nav.appendChild(makeLink(a.getAttribute("href"), a.textContent.trim()));
          }
        });
        el.remove();
      });
    }
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
