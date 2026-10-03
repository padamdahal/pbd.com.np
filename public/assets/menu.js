(() => {
  "use strict";

  // Year in footer
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // Mark current page on build-time static links (from menubuilder.js)
  const here = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll("#menu a[href], #footer-menu a[href]").forEach((a) => {
    try {
      const path = new URL(a.getAttribute("href"), location.origin).pathname.replace(
        /index\.html$/,
        ""
      );
      if (path === here) a.setAttribute("aria-current", "page");
    } catch {
      /* ignore bad hrefs */
    }
  });

  // Header UX only — links come from menubuilder static HTML
  const nav = document.getElementById("menu");
  if (!nav) return;

  nav.classList.add("site-nav");
  if (!nav.getAttribute("role")) nav.setAttribute("role", "navigation");

  const closeAll = () => {
    nav.querySelectorAll(".nav-item.open").forEach((li) => {
      li.classList.remove("open");
      li.querySelector(".nav-link")?.setAttribute("aria-expanded", "false");
    });
  };

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) closeAll();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  nav.querySelectorAll(".nav-item").forEach((li) => {
    const btn = li.querySelector(":scope > .nav-link");
    const sub = li.querySelector(":scope > .submenu");
    if (!btn || !sub) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = li.classList.contains("open");
      closeAll();
      if (!isOpen) {
        li.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    // Mouse open/close backup for CSS :hover (avoids flicker on sub-pixel gaps)
    let closeTimer = null;
    const openNow = () => {
      clearTimeout(closeTimer);
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      nav.querySelectorAll(".nav-item.open").forEach((other) => {
        if (other !== li) {
          other.classList.remove("open");
          other.querySelector(".nav-link")?.setAttribute("aria-expanded", "false");
        }
      });
      li.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    };
    const closeSoon = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        li.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }, 150);
    };
    li.addEventListener("mouseenter", openNow);
    li.addEventListener("mouseleave", closeSoon);
  });

  const toggle = document.getElementById("nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle("mobile-open");
      toggle.setAttribute("aria-expanded", String(open));
      if (!open) closeAll();
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && window.matchMedia("(max-width:640px)").matches) {
        nav.classList.remove("mobile-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // --- Client-side menu fetch disabled (test static nav from menubuilder only) ---
  // fetch("/menu.json")
  //   .then((r) => r.json())
  //   .then((data) => {
  //     const header = document.getElementById("menu");
  //     const footer = document.getElementById("footer-menu");
  //     if (header && !header.querySelector("a[href]")) buildHeaderNav(header, data);
  //     if (footer && !footer.querySelector("a[href]")) buildFooterNav(footer, data);
  //   })
  //   .catch(() => { /* menu is optional */ });
})();
