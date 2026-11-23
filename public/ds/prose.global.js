(() => {

const STRINGS = {
  en: {
    copy: "Copy", copied: "Copied", copy_failed: "Couldn't copy", copy_label: "Copy code",
    read: "{n} min read", toc: "On this page", newer: "Newer", older: "Older", prev: "Previous post", next: "Next post",
    all_posts: "All posts", tagged: "Posts tagged {tag}", updated: "Updated {date}", page: "Page {n} of {total}",
    other_lang: "Leer en español", empty: "No posts yet.", anchor: "Link to this section",
  },
  es: {
    copy: "Copiar", copied: "Copiado", copy_failed: "No se pudo copiar", copy_label: "Copiar el código",
    read: "{n} min de lectura", toc: "En esta página", newer: "Más recientes", older: "Anteriores", prev: "Artículo anterior", next: "Artículo siguiente",
    all_posts: "Todos los artículos", tagged: "Artículos sobre {tag}", updated: "Actualizado el {date}", page: "Página {n} de {total}",
    other_lang: "Read in English", empty: "Aún no hay artículos.", anchor: "Enlace a esta sección",
  },
};

const langOf = (l) => ((l || (typeof document !== "undefined" && document.documentElement.lang) || "en").toLowerCase().startsWith("es") ? "es" : "en");
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v && k in v ? v[k] : ""));
const t = (key, lang, vars) => fill(STRINGS[langOf(lang)][key] ?? STRINGS.en[key] ?? key, vars);

function postDate(iso, lang) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
  return new Intl.DateTimeFormat(langOf(lang) === "es" ? "es-419" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(d);
}

function readingTime(text, lang) {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return t("read", lang, { n: Math.max(1, Math.round(words / 230)) });
}

function wireCodeBlocks(root = document, lang) {
  const L = langOf(lang);
  for (const btn of root.querySelectorAll(".ds-codeblock-copy")) {
    if (btn.dataset.wired) continue;
    btn.dataset.wired = "1";
    btn.type = "button";
    btn.setAttribute("aria-label", t("copy_label", L));
    btn.textContent = t("copy", L);
    const live = document.createElement("span");
    live.className = "ds-sr";
    live.setAttribute("aria-live", "polite");
    btn.after(live);
    let timer;
    btn.addEventListener("click", async () => {
      const code = btn.closest(".ds-codeblock")?.querySelector("pre")?.innerText ?? "";
      let ok = true;
      try { await navigator.clipboard.writeText(code.replace(/\n$/, "")); } catch { ok = false; }
      live.textContent = t(ok ? "copied" : "copy_failed", L);
      if (ok) btn.textContent = t("copied", L);  // a failure is only announced, so the button never changes width
      clearTimeout(timer);
      timer = setTimeout(() => { btn.textContent = t("copy", L); live.textContent = ""; }, 2000);
    });
  }
}

window.DSProse = { STRINGS, t, postDate, readingTime, wireCodeBlocks };
})();

