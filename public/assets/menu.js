(() => {
  "use strict";

  // Year in footer
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const here = location.pathname.replace(/index\.html$/, "");

  const link = (item) => {
    const a = document.createElement("a");
    a.href = item.path;
    a.textContent = item.title;
    if (item.path === here) a.setAttribute("aria-current", "page");
    return a;
  };

  function markCurrent(root) {
    if (!root) return;
    root.querySelectorAll("a[href]").forEach((a) => {
      try {
        const path = new URL(a.getAttribute("href"), location.origin).pathname.replace(
          /index\.html$/,
          ""
        );
        if (path === here) a.setAttribute("aria-current", "page");
      } catch {
        /* ignore */
      }
    });
  }

  function wireHeaderUx(nav) {
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
  }

  function buildHeaderNav(nav, data) {
    for (const cat of data.categories) {
      if (!cat.items.length) continue;
      const li = document.createElement("div");
      li.className = "nav-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-link";
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      btn.append(cat.label + " ");
      const caret = document.createElement("span");
      caret.className = "nav-caret";
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "\u25BE";
      btn.appendChild(caret);

      const sub = document.createElement("div");
      sub.className = "submenu";
      sub.setAttribute("role", "menu");
      for (const it of cat.items) {
        const a = link(it);
        a.setAttribute("role", "menuitem");
        sub.appendChild(a);
      }

      li.append(btn, sub);
      nav.appendChild(li);
    }

    for (const it of data.top) {
      const wrap = document.createElement("div");
      wrap.className = "nav-item";
      wrap.appendChild(link(it));
      nav.appendChild(wrap);
    }
  }

  function buildFooterNav(nav, data) {
    for (const cat of data.categories) {
      if (!cat.items.length) continue;
      const group = document.createElement("div");
      group.className = "footer-group";
      const label = document.createElement("span");
      label.className = "footer-group-label";
      label.textContent = cat.label;
      group.appendChild(label);
      const links = document.createElement("div");
      links.className = "footer-group-links";
      for (const it of cat.items) links.appendChild(link(it));
      group.appendChild(links);
      nav.appendChild(group);
    }
    if (data.top && data.top.length) {
      const group = document.createElement("div");
      group.className = "footer-group";
      const links = document.createElement("div");
      links.className = "footer-group-links";
      for (const it of data.top) links.appendChild(link(it));
      group.appendChild(links);
      nav.appendChild(group);
    }
  }

  const header = document.getElementById("menu");
  const footer = document.getElementById("footer-menu");
  const headerHasLinks = header && header.querySelector("a[href]");
  const footerHasLinks = footer && footer.querySelector("a[href]");

  // Prefer build-time static links (SEO). Fetch only if a nav is still empty.
  if (headerHasLinks && footerHasLinks) {
    markCurrent(header);
    markCurrent(footer);
    wireHeaderUx(header);
    return;
  }

  fetch("/menu.json")
    .then((r) => r.json())
    .then((data) => {
      if (header && !headerHasLinks) buildHeaderNav(header, data);
      if (footer && !footerHasLinks) buildFooterNav(footer, data);
      markCurrent(header);
      markCurrent(footer);
      wireHeaderUx(header);
    })
    .catch(() => {
      wireHeaderUx(header);
    });
})();
