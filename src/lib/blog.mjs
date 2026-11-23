// The blog from markdown: _content/posts/{en,es}/*.md and _content/tags.yml. Ported from scripts/build-blog.mjs with
// the same rules and the same rendering; Designer's spec is ~/dev/personal/design/specs/rodmjay-blog.md.
//
// A post is two files, English and Spanish, tied by the same `id` in the front matter. It goes live only when both
// say `draft: false`; a missing `draft` counts as a draft. Draft pages are built with noindex and kept out of the
// feeds and the sitemap; while nothing is live, the index lists the drafts as samples (noindex too).
// The build fails when: a live post lacks its twin, an image or figure has no alt text, a tag isn't in tags.yml,
// a dek is over 180 characters, or the Spanish isn't "usted". Fixed words come from ds/prose.global.js (STRINGS).
// BLOG_DRAFTS=0 leaves draft pages out.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import container from "markdown-it-container";
import { load as yamlLoad } from "js-yaml";
import { imageSize } from "image-size";
import { createHighlighter, createCssVariablesTheme, bundledLanguages } from "shiki";
import { ROOT, LANGS, read, dict } from "./site.mjs";
import { checkUsted, slugify } from "./usted.mjs";

export const PER_PAGE = 10;
export const BASE = { en: "/blog/", es: "/es/blog/" };
const DRAFTS = process.env.BLOG_DRAFTS !== "0";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- Fixed words: prose.js STRINGS (dates, reading time, pager, copy) ----
const ctx = createContext({ window: {} });
runInContext(read("public/ds/prose.global.js"), ctx, { filename: "public/ds/prose.global.js" });
const P = ctx.window.DSProse;
export const pt = (key, lang, vars) => P.t(key, lang, vars);
export const postDate = (iso, lang) => P.postDate(iso, lang);

// Image sizes for files under public/, so nothing jumps while it loads.
export function imgDims(src) {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return null;
  const file = join(ROOT, "public", decodeURIComponent(src.split(/[?#]/)[0]));
  if (!existsSync(file)) return null;
  try { const d = imageSize(readFileSync(file)); return d.width && d.height ? { width: d.width, height: d.height } : null; } catch { return null; }
}
const dimsAttr = (src) => { const d = imgDims(src); return d ? ` width="${d.width}" height="${d.height}"` : ""; };

async function build() {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  for (const [k, s] of Object.entries(dict("es").blog)) checkUsted(s, `i18n/es.json blog.${k}`, fail);

  // ---- Tags ----
  const TAGS = new Map();
  for (const tag of yamlLoad(read("_content/tags.yml")).tags || []) {
    if (!tag.key || !tag.en || !tag.es) { fail(`_content/tags.yml: every tag needs key, en and es (${JSON.stringify(tag)})`); continue; }
    checkUsted(tag.es, `_content/tags.yml ${tag.key}`, fail);
    TAGS.set(tag.key, { key: tag.key, name: { en: tag.en, es: tag.es }, slug: { en: slugify(tag.en), es: slugify(tag.es) } });
  }
  const tagUrl = (key, lang) => `${BASE[lang]}tag/${TAGS.get(key).slug[lang]}/`;

  // ---- Markdown ----
  const theme = createCssVariablesTheme({ name: "css-variables", variablePrefix: "--shiki-", fontStyle: true });
  const sources = LANGS.flatMap((lang) => {
    const dir = join(ROOT, "_content/posts", lang);
    return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => ({ lang, file: `_content/posts/${lang}/${f}`, slug: f.slice(0, -3) })) : [];
  });
  for (const s of sources) s.raw = read(s.file).replace(/\r\n/g, "\n");
  const fenceLangs = new Set(sources.flatMap((s) => [...s.raw.matchAll(/^(?:```|~~~)\s*([\w+#.-]+)/gm)].map((m) => m[1].toLowerCase())));
  const highlighter = await createHighlighter({ themes: [theme], langs: [...fenceLangs].filter((l) => l in bundledLanguages) });
  const loaded = new Set(highlighter.getLoadedLanguages());

  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  md.use(footnote);
  md.use(container, "pullquote", { render: (tokens, i, _o, env) => {
    if (tokens[i].nesting === 1) { env.pullquotes = (env.pullquotes || 0) + 1; return '<figure class="ds-pullquote">\n'; }
    return "</figure>\n";
  } });
  md.use(container, "wide", { render: (tokens, i) => (tokens[i].nesting === 1 ? '<div class="wide">\n' : "</div>\n") });

  const inlineText = (tok) => (tok.children || []).map((c) => (c.type === "text" || c.type === "code_inline" ? c.content : "")).join("");

  // Heading ids: `## Title {#id}` sets one, otherwise a slug of the text. Each h2–h4 gets the # anchor.
  md.core.ruler.push("heading_ids", (state) => {
    const seen = new Set();
    const toks = state.tokens;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].type !== "heading_open") continue;
      const inline = toks[i + 1];
      let id;
      const last = inline.children?.[inline.children.length - 1];
      const m = last?.type === "text" && last.content.match(/\s*\{#([\w-]+)\}\s*$/);
      if (m) { id = m[1]; last.content = last.content.slice(0, m.index); inline.content = inline.content.replace(/\s*\{#[\w-]+\}\s*$/, ""); }
      const text = inlineText(inline).trim();
      id ||= slugify(text) || "section";
      let unique = id, n = 2;
      while (seen.has(unique)) unique = `${id}-${n++}`;
      seen.add(unique);
      toks[i].attrSet("id", unique);
      (state.env.headings ||= []).push({ level: Number(toks[i].tag.slice(1)), id: unique, text });
    }
  });
  md.renderer.rules.heading_open = (tokens, i, _o, env) => {
    const tok = tokens[i], id = tok.attrGet("id"), level = Number(tok.tag.slice(1));
    const anchor = level >= 2 && level <= 4 ? `<a class="ds-anchor" href="#${esc(id)}" aria-label="${esc(pt("anchor", env.lang))}">#</a>` : "";
    return `<${tok.tag} id="${esc(id)}">${anchor}`;
  };

  // An image alone in its paragraph with a title becomes a figure with a caption. Every image needs alt text.
  md.core.ruler.push("figures", (state) => {
    const toks = state.tokens;
    for (let i = 0; i + 2 < toks.length; i++) {
      if (toks[i].type !== "paragraph_open" || toks[i + 1].type !== "inline" || toks[i + 2].type !== "paragraph_close") continue;
      const kids = (toks[i + 1].children || []).filter((c) => !(c.type === "text" && !c.content.trim()) && c.type !== "softbreak");
      if (kids.length === 1 && kids[0].type === "image" && kids[0].attrGet("title")) {
        kids[0].meta = { ...(kids[0].meta || {}), figure: true };
        toks[i].hidden = toks[i + 2].hidden = true;
      }
    }
  });
  md.renderer.rules.image = (tokens, i, _o, env) => {
    const tok = tokens[i], src = tok.attrGet("src"), title = tok.attrGet("title");
    const alt = md.renderer.renderInlineAsText(tok.children || [], {}, env).trim();
    if (!alt) fail(`${env.file}: the image ${src} has no alt text`);
    const img = `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"${dimsAttr(src)}>`;
    return tok.meta?.figure ? `<figure>${img}<figcaption>${md.renderInline(title, env)}</figcaption></figure>\n` : img;
  };

  // Code: ```lang title="file" {3,5-7}. A title or a language gives the labelled block with Copy; `bare` gives a plain one.
  // The CSP allows no style attributes (public/staticwebapp.config.json), so Shiki's inline token styles become
  // classes (public/blog/blog.css: .shk-<token>, .shk-i, .shk-b, .shk-u). <pre> loses its style: the design system
  // already sets its colors. An unknown declaration fails the build rather than render unstyled.
  const SHK = { "font-style:italic": "shk-i", "font-weight:bold": "shk-b", "text-decoration:underline": "shk-u" };
  const styleToClass = { root(tree) {
    const walk = (node) => {
      const style = node.properties?.style;
      if (typeof style === "string") {
        delete node.properties.style;
        if (node.tagName !== "pre") for (const decl of style.split(";").map((d) => d.replace(/\s+/g, "")).filter(Boolean)) {
          const tok = decl.match(/^color:var\(--shiki-([\w-]+)\)$/)?.[1];
          const cls = tok ? `shk-${tok}` : SHK[decl];
          if (!cls) throw new Error(`blog: Shiki emitted a style the CSP would block: ${decl}`);
          this.addClassToHast(node, cls);
        }
      }
      for (const c of node.children || []) walk(c);
    };
    walk(tree);
  } };

  function fence(content, info, env) {
    const lang = (info.match(/^([\w+#.-]+)/)?.[1] || "").toLowerCase();
    const title = info.match(/title="([^"]*)"/)?.[1];
    const marks = new Set();
    for (const part of info.match(/\{([\d,\s-]+)\}/)?.[1].split(",") || []) {
      const [a, b] = part.trim().split("-").map(Number);
      for (let n = a; n <= (b || a); n++) marks.add(n);
    }
    const html = highlighter.codeToHtml(content.replace(/\n$/, ""), {
      lang: loaded.has(lang) ? lang : "text", theme: "css-variables",
      transformers: [{ line(node, n) { if (marks.has(n)) this.addClassToHast(node, "highlighted"); } }, styleToClass],
    });
    const label = title || (lang && lang !== "text" ? lang : "");
    if (/(^|\s)bare(\s|$)/.test(info) || !label) return `${html}\n`;
    return `<figure class="ds-codeblock"><figcaption><span>${esc(label)}</span><button class="ds-codeblock-copy">${esc(pt("copy", env.lang))}</button></figcaption>${html}</figure>\n`;
  }
  md.renderer.rules.fence = (tokens, i, _o, env) => fence(tokens[i].content, tokens[i].info.trim(), env);
  md.renderer.rules.code_block = (tokens, i, _o, env) => fence(tokens[i].content, "text bare", env);

  // Footnotes in the design system's markup: <sup><a>1</a></sup> and <div class="footnotes"><ol><li>… ↩</li></ol></div>.
  const fnId = (tokens, i, o, env, slf) => slf.rules.footnote_anchor_name(tokens, i, o, env, slf);
  md.renderer.rules.footnote_ref = (tokens, i, o, env, slf) => {
    const id = fnId(tokens, i, o, env, slf), sub = tokens[i].meta.subId;
    return `<sup><a href="#fn${id}" id="r${id}${sub > 0 ? `-${sub}` : ""}">${tokens[i].meta.id + 1}</a></sup>`;
  };
  md.renderer.rules.footnote_block_open = () => '<div class="footnotes"><ol>';
  md.renderer.rules.footnote_block_close = () => "</ol></div>\n";
  md.renderer.rules.footnote_open = (tokens, i, o, env, slf) => `<li id="fn${fnId(tokens, i, o, env, slf)}">`;
  md.renderer.rules.footnote_close = () => "</li>";
  md.renderer.rules.footnote_anchor = (tokens, i, o, env, slf) => {
    const id = fnId(tokens, i, o, env, slf), sub = tokens[i].meta.subId;
    return ` <a href="#r${id}${sub > 0 ? `-${sub}` : ""}" aria-label="${esc(dict(env.lang).blog.backToText)}">↩</a>`;
  };
  md.core.ruler.push("footnote_tight", (state) => {
    const toks = state.tokens;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].type !== "footnote_open") continue;
      let j = i + 1;
      const paras = [];
      while (toks[j] && toks[j].type !== "footnote_close") { if (toks[j].type.startsWith("paragraph_")) paras.push(toks[j]); j++; }
      if (paras.length === 2) paras.forEach((p) => (p.hidden = true));
    }
  });

  function renderBody(src, env) {
    let html = md.render(src, env);
    // A quote's last line "— Name" becomes its <cite>.
    html = html.replace(/<p>[—–]\s*([\s\S]*?)<\/p>\n<\/blockquote>/g, "<cite>$1</cite>\n</blockquote>");
    // ::: wide around a figure puts the class on the figure, so `.ds-prose > .wide` reaches it.
    html = html.replace(/<div class="wide">\n<figure([^>]*)>([\s\S]*?)<\/figure>\n<\/div>/g, (m, a, body) => `<figure class="wide"${a.replace(/\sclass="[^"]*"/, "")}>${body}</figure>`);
    for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="[^"]+"/.test(m[0])) fail(`${env.file}: an <img> has no alt text`);
    for (const m of html.matchAll(/<svg\b[^>]*role="img"[^>]*>/g)) if (!/aria-label="[^"]+"/.test(m[0])) fail(`${env.file}: an <svg role="img"> has no aria-label`);
    if ((env.pullquotes || 0) > 2) fail(`${env.file}: ${env.pullquotes} pull quotes; at most 2 per post`);
    return html;
  }

  // ---- Read the posts ----
  const FM = /^---\n([\s\S]*?)\n---\n?/;
  const posts = [];
  for (const s of sources) {
    const m = s.raw.match(FM);
    if (!m) { fail(`${s.file}: no front matter`); continue; }
    let fm;
    try { fm = yamlLoad(m[1]) || {}; } catch (e) { fail(`${s.file}: ${e.message}`); continue; }
    const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? "").slice(0, 10);
    const post = { lang: s.lang, file: s.file, slug: s.slug, id: String(fm.id ?? ""), title: String(fm.title ?? ""), dek: String(fm.dek ?? ""), date,
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [], cover: fm.cover || "", coverAlt: String(fm.cover_alt ?? ""),
      draft: fm.draft !== false, toc: fm.toc, body: s.raw.slice(m[0].length) };
    if (!post.id) fail(`${s.file}: needs an id (the same in both languages)`);
    if (!post.title) fail(`${s.file}: needs a title`);
    if (!post.dek) fail(`${s.file}: needs a dek`);
    if ([...post.dek].length > 180) fail(`${s.file}: the dek is ${[...post.dek].length} characters; 180 at most`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`${s.file}: date must be YYYY-MM-DD`);
    if (s.slug !== slugify(s.slug)) fail(`${s.file}: the file name must be a plain slug (a-z, 0-9, -)`);
    for (const k of post.tags) if (!TAGS.has(k)) fail(`${s.file}: tag "${k}" isn't in _content/tags.yml`);
    if (post.cover && !post.coverAlt) fail(`${s.file}: the cover needs cover_alt`);
    if (s.lang === "es") { checkUsted(`${post.title}\n${post.dek}\n${post.coverAlt}`, s.file, fail); checkUsted(post.body, s.file, fail); }
    posts.push(post);
  }
  const groups = new Map();
  for (const p of posts) {
    const g = groups.get(p.id) || {};
    if (g[p.lang]) fail(`${p.file}: id "${p.id}" is already used by ${g[p.lang].file}`);
    g[p.lang] = p;
    groups.set(p.id, g);
  }
  for (const [id, g] of groups) {
    for (const lang of LANGS) {
      const p = g[lang], other = g[lang === "en" ? "es" : "en"];
      if (p && !p.draft && (!other || other.draft))
        fail(`post "${id}": ${p.file} is live, but its ${lang === "en" ? "Spanish" : "English"} twin is ${other ? `a draft (${other.file})` : "missing"}. A post goes live only in both languages.`);
    }
    for (const p of Object.values(g)) p.twin = g[p.lang === "en" ? "es" : "en"];
  }
  if (errors.length) throw new Error(`blog:\n${errors.join("\n")}`);

  for (const p of posts) {
    p.live = !p.draft; // twins were checked above: live in one language means live in both
    p.url = `${BASE[p.lang]}${p.slug}/`;
    p.env = { lang: p.lang, file: p.file, headings: [] };
    p.html = renderBody(p.body, p.env);
    p.reading = P.readingTime(p.html.replace(/<[^>]+>/g, " "), p.lang);
  }
  if (errors.length) throw new Error(`blog:\n${errors.join("\n")}`);

  const byDate = (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
  const live = Object.fromEntries(LANGS.map((l) => [l, posts.filter((p) => p.lang === l && p.live).sort(byDate)]));
  const SAMPLE = live.en.length === 0; // nothing live yet: the index shows the drafts as samples, noindex
  const drafts = Object.fromEntries(LANGS.map((l) => [l, DRAFTS ? posts.filter((p) => p.lang === l && !p.live).sort(byDate) : []]));
  const listed = Object.fromEntries(LANGS.map((l) => [l, SAMPLE ? drafts[l] : live[l]]));
  const built = Object.fromEntries(LANGS.map((l) => [l, [...live[l], ...drafts[l]]]));

  for (const p of posts) {
    const other = p.lang === "en" ? "es" : "en";
    // The twin, when it's built and as live as this one; otherwise the other language's index.
    p.twinUrl = p.twin && (p.twin.live || !p.live) && (DRAFTS || p.twin.live) ? p.twin.url : BASE[other];
    const list = p.live ? live[p.lang] : drafts[p.lang];
    const i = list.indexOf(p);
    p.prev = list[i - 1] ? { url: list[i - 1].url, title: list[i - 1].title } : null;
    p.next = list[i + 1] ? { url: list[i + 1].url, title: list[i + 1].title } : null;
    p.coverDims = imgDims(p.cover);
  }

  // Tags in use, per language, sorted by name.
  const usedTags = (lang, items) => [...new Set(items.flatMap((p) => p.tags))].sort((a, b) => TAGS.get(a).name[lang].localeCompare(TAGS.get(b).name[lang], lang === "es" ? "es-419" : "en"));

  // Every list page: the index and each tag, paged. path → { lang, items, n, total, tagKey, base, otherPath }.
  const lists = [];
  for (const lang of LANGS) {
    const other = lang === "en" ? "es" : "en";
    const add = (items, base, otherBase, tagKey) => {
      const total = Math.max(1, Math.ceil(items.length / PER_PAGE));
      for (let n = 1; n <= total; n++) {
        lists.push({ lang, n, total, tagKey, base, items: items.slice((n - 1) * PER_PAGE, n * PER_PAGE),
          path: n === 1 ? base : `${base}page/${n}/`, otherPath: n === 1 ? otherBase : `${otherBase}page/${n}/` });
      }
    };
    add(listed[lang], BASE[lang], BASE[other], null);
    for (const key of usedTags(lang, listed[lang])) add(listed[lang].filter((p) => p.tags.includes(key)), tagUrl(key, lang), tagUrl(key, other), key);
  }

  const tagInfo = (key) => { const t = TAGS.get(key); return { key, name: t.name, slug: t.slug }; };
  const strip = read("src/zones/blog/strip.svg").trimEnd();
  const stripSlim = read("src/zones/blog/strip-slim.svg").trim();
  return { posts, live, drafts, listed, built, SAMPLE, lists, tagUrl, tagInfo, usedTags, strip, stripSlim };
}

let memo;
export const loadBlog = () => (memo ||= build());

// A post's or list page's slug parts, for generateStaticParams.
export async function postParams(lang) {
  const b = await loadBlog();
  return b.built[lang].map((p) => ({ slug: p.slug }));
}
