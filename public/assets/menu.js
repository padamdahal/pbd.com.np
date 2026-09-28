(async () => {
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
  try {
    const items = await (await fetch("/menu.json")).json();
    const here = location.pathname.replace(/index\.html$/, "");
    for (const id of ["menu", "footer-menu"]) {
      const nav = document.getElementById(id);
      if (!nav) continue;
      for (const it of items) {
        const a = document.createElement("a");
        a.href = it.path;
        a.textContent = it.title;
        if (it.path === here) a.setAttribute("aria-current", "page");
        nav.appendChild(a);
      }
    }
  } catch (e) { /* menu is optional */ }
})();
