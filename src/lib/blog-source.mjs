// Where the blog comes from (docs/adr/0003): the markdown in _content/ (the default, and the fallback until cutover), or
// the CMS's published posts, fetched before the build by scripts/cms-snapshot.mjs into .cms/snapshot.json
// (CMS_SOURCE=payload). Either way the result is the same shape, the front matter and the markdown body the site has
// always read, so src/lib/blog.mjs renders both with the same code and the pages come out byte for byte the same.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { ROOT, LANGS, read } from "./site.mjs";

export const CMS = process.env.CMS_SOURCE === "payload";

// [{ key, en, es }], as _content/tags.yml.
export function loadTags() {
  if (!CMS) return yamlLoad(read("_content/tags.yml")).tags || [];
  return snapshot().tags.map((t) => ({ key: t.key, en: t.en, es: t.es }));
}

// [{ lang, file, slug, fm, body, fmError? }]: `file` names the source in error messages, `fm` is the front matter.
export function loadSources() {
  return CMS ? fromSnapshot() : fromMarkdown();
}

const FM = /^---\n([\s\S]*?)\n---\n?/;
function fromMarkdown() {
  const out = [];
  for (const lang of LANGS) {
    const dir = join(ROOT, "_content/posts", lang);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
      const file = `_content/posts/${lang}/${f}`;
      const raw = read(file).replace(/\r\n/g, "\n");
      const m = raw.match(FM);
      const s = { lang, file, slug: f.slice(0, -3), fm: null, body: raw };
      if (!m) s.fmError = "no front matter";
      else {
        try { s.fm = yamlLoad(m[1]) || {}; } catch (e) { s.fmError = e.message; }
        s.body = raw.slice(m[0].length);
      }
      out.push(s);
    }
  }
  return out;
}

let memo;
function snapshot() {
  if (memo) return memo;
  const file = join(ROOT, ".cms/snapshot.json");
  if (!existsSync(file)) throw new Error("blog: CMS_SOURCE=payload but .cms/snapshot.json is missing; run scripts/cms-snapshot.mjs first (npm run build does)");
  return (memo = JSON.parse(readFileSync(file, "utf8")));
}

function fromSnapshot() {
  const s = snapshot();
  const tagKey = new Map(s.tags.map((t) => [String(t.id), t.key]));
  const mediaFile = new Map(s.media.map((m) => [String(m.id), m.filename]));
  const out = [];
  // Ordered as the markdown is (by language, then file name), so anything that depends on read order matches.
  for (const lang of LANGS) {
    for (const p of s.posts) {
      const slug = p.slug?.[lang];
      if (!slug && !p.title?.[lang] && !p.body?.[lang]) continue; // not in this language
      const cover = p.cover != null ? `/blog/media/${mediaFile.get(String(p.cover)) ?? `missing-media-${p.cover}`}` : "";
      out.push({
        lang,
        file: `cms:posts/${p.key}/${lang}`,
        slug: slug || "",
        fm: {
          id: p.key,
          title: p.title?.[lang] ?? "",
          dek: p.dek?.[lang] ?? "",
          date: String(p.date ?? "").slice(0, 10),
          tags: (p.tags || []).map((t) => tagKey.get(String(typeof t === "object" ? t.id : t)) ?? `unknown-tag-${t}`),
          ...(cover ? { cover, cover_alt: p.coverAlt?.[lang] ?? "" } : {}),
          toc: p.toc,
          draft: false, // the snapshot holds published posts only
        },
        body: p.body?.[lang] ?? "",
      });
    }
  }
  const name = (x) => `${x.slug}.md`; // the markdown's own order: file names, sorted
  return out.sort((a, b) => (a.lang === b.lang ? (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0) : LANGS.indexOf(a.lang) - LANGS.indexOf(b.lang)));
}
