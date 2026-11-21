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

// Resume request: validates, posts to the resume-request Edge Function (Supabase), shows the 24-hour link.
// Nothing is stored in the page. On localhost, ?mock=ok|rate|err fakes the reply for the preview.
(function () {
  var form = document.getElementById("rform");
  if (!form) return;
  var F = function (n) { return form.elements.namedItem(n); };
  var started = Date.now(), d = form.dataset, btn = document.getElementById("rf-submit"), banner = document.getElementById("rf-banner");
  var checks = {
    name: function (v) { return v.trim().length > 0 || d.errName; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || d.errEmail; },
    company: function (v) { return v.trim().length > 0 || d.errCompany; },
    role: function (v) { return v.trim().length > 0 || d.errRole; }
  };
  function show(input, msg) {
    var err = document.getElementById(input.id + "-err");
    if (msg === true) { input.removeAttribute("aria-invalid"); err.hidden = true; err.textContent = ""; return true; }
    input.setAttribute("aria-invalid", "true"); err.textContent = msg; err.hidden = false; return false;
  }
  function check(name) {
    return show(F(name), checks[name](F(name).value));
  }
  ["name", "email", "company", "role"].forEach(function (n) { F(n).addEventListener("blur", function () { if (form.dataset.tried) check(n); }); });

  function reply() {
    var mock = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("mock");
    if (mock) return new Promise(function (r) { setTimeout(function () {
      r(mock === "ok" ? { ok: true, url: "#mock-download" } : mock === "rate" ? { ok: false, error: "rate_limited", retry_minutes: 12 } : { ok: false, error: "server" });
    }, 600); });
    return fetch(window.RESUME_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: F("name").value.trim(), email: F("email").value.trim(), company: F("company").value.trim(), role: F("role").value.trim(),
      source: F("source").value.trim() || null, consent: F("consent").checked, hp: F("website").value, t: started,
      lang: d.lang.indexOf("es") === 0 ? "es" : "en"
    }) }).then(function (r) { return r.json(); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    form.dataset.tried = "1";
    banner.hidden = true;
    var bad = ["name", "email", "company", "role"].filter(function (n) { return !check(n); });
    if (bad.length) { F(bad[0]).focus(); return; }
    var label = btn.textContent;
    btn.style.width = btn.offsetWidth + "px"; btn.disabled = true; btn.textContent = d.sending;
    reply().then(function (res) {
      if (res && res.ok && res.url) {
        var box = document.getElementById("rbox"), done = document.getElementById("rdone");
        box.style.minHeight = box.offsetHeight + "px";
        document.getElementById("rdone-link").href = res.url;
        form.hidden = true; done.hidden = false;
        document.getElementById("rdone-title").focus();
        return;
      }
      throw res;
    }).catch(function (res) {
      var msg = res && res.error === "rate_limited" ? d.rate.replace("{n}", res.retry_minutes || 60) : d.server;
      banner.querySelector("p").textContent = msg; banner.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = label; btn.style.width = ""; });
  });
})();
