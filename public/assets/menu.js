(() => {
  "use strict";
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

  function buildHeaderNav(nav, data) {
    nav.classList.add("site-nav");
    nav.setAttribute("role", "navigation");

    const closeAll = () => {
      nav.querySelectorAll(".nav-item.open").forEach((li) => {
        li.classList.remove("open");
        li.querySelector(".nav-link")?.setAttribute("aria-expanded", "false");
      });
    };
    document.addEventListener("click", (e) => { if (!nav.contains(e.target)) closeAll(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

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
      caret.className = "nav-caret"; caret.setAttribute("aria-hidden", "true"); caret.textContent = "\u25BE";
      btn.appendChild(caret);

      const sub = document.createElement("div");
      sub.className = "submenu";
      sub.setAttribute("role", "menu");
      for (const it of cat.items) {
        const a = link(it);
        a.setAttribute("role", "menuitem");
        sub.appendChild(a);
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = li.classList.contains("open");
        closeAll();
        if (!isOpen) { li.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
      });

      // Mouse-driven open/close as a robust backup to the CSS :hover rule
      // (covers any sub-pixel gap some browsers introduce between the
      // button and the submenu, which is what causes it to flicker shut).
      let closeTimer = null;
      const openNow = () => {
        clearTimeout(closeTimer);
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        nav.querySelectorAll(".nav-item.open").forEach((other) => {
          if (other !== li) { other.classList.remove("open"); other.querySelector(".nav-link")?.setAttribute("aria-expanded", "false"); }
        });
        li.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      };
      const closeSoon = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => { li.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }, 150);
      };
      li.addEventListener("mouseenter", openNow);
      li.addEventListener("mouseleave", closeSoon);

      li.append(btn, sub);
      nav.appendChild(li);
    }

    for (const it of data.top) {
      const wrap = document.createElement("div");
      wrap.className = "nav-item";
      wrap.appendChild(link(it));
      nav.appendChild(wrap);
    }

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

  function buildFooterNav(nav, data) {
    for (const cat of data.categories) for (const it of cat.items) nav.appendChild(link(it));
    for (const it of data.top) nav.appendChild(link(it));
  }

  fetch("/menu.json")
    .then((r) => r.json())
    .then((data) => {
      const header = document.getElementById("menu");
      if (header) buildHeaderNav(header, data);
      const footer = document.getElementById("footer-menu");
      if (footer) buildFooterNav(footer, data);
    })
    .catch(() => { /* menu is optional */ });
})();
