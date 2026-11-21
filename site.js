// Language menu: remembers the choice and moves to the other language's page. Nothing here sends data anywhere.
(function () {
  var sel = document.getElementById("lang");
  if (sel) sel.addEventListener("change", function () {
    try { localStorage.setItem("ds-lang", sel.value); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.assign(new URL(sel.dataset.other, location.href).pathname + u.search + u.hash);
  });
})();

// Grid: rays to the vanishing point, rows spaced wider toward the viewer. Drawn once.
(() => {
  const ns = "http://www.w3.org/2000/svg", rays = document.getElementById("rays"), rows = document.getElementById("rows");
  for (let i = -14; i <= 14; i++) { const l = document.createElementNS(ns, "line"); l.setAttribute("x1", 720); l.setAttribute("y1", 630); l.setAttribute("x2", 720 + i * 150); l.setAttribute("y2", 900); rays.append(l); }
  for (let k = 1; k <= 12; k++) { const y = 630 + 270 * Math.pow(k / 12, 2.2); const l = document.createElementNS(ns, "line"); l.setAttribute("x1", 0); l.setAttribute("x2", 1440); l.setAttribute("y1", y); l.setAttribute("y2", y); rows.append(l); }
  // Parallax: one passive listener, one rAF write of --p. Nothing runs with reduced motion.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const scene = document.getElementById("scene"); let ticking = false;
  const update = () => { ticking = false; const h = scene.offsetHeight; scene.style.setProperty("--p", Math.min(1, Math.max(0, scrollY / h)).toFixed(3)); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
