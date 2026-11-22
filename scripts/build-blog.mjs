// Builds the blog from markdown: _content/posts/{en,es}/*.md and _content/tags.yml.
// Designer's spec: ~/dev/personal/design/specs/rodmjay-blog.md ("For Software Architect").
//
//   node scripts/build-blog.mjs               writes blog/, es/blog/, the RSS feeds and sitemap.xml in the repo
//   node scripts/build-blog.mjs --out <dir>   writes them under <dir> instead
//   node scripts/build-blog.mjs --no-drafts   leaves draft pages out
//
// A post is two files, English and Spanish, tied by the same `id` in the front matter. It goes live only when both
// say `draft: false`; a missing `draft` counts as a draft. Draft pages are built with noindex and kept out of the
// feeds and the sitemap; while nothing is live, the index lists the drafts as samples (noindex too).
// The build fails when: a live post lacks its twin, an image or figure has no alt text, a tag isn't in tags.yml,
// a dek is over 180 characters, or the Spanish isn't "usted". Fixed words come from ds/prose.global.js (STRINGS).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createContext, runInContext } from "node:vm";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import container from "markdown-it-container";
import { load as yamlLoad } from "js-yaml";
import { imageSize } from "image-size";
import { createHighlighter, createCssVariablesTheme, bundledLanguages } from "shiki";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : ROOT;
const DRAFTS = !args.includes("--no-drafts") && process.env.BLOG_DRAFTS !== "0";
const SITE = "https://rodmjay.com";
const LANGS = ["en", "es"];
const HTML_LANG = { en: "en", es: "es-419" };
const NAMES = { en: "English", es: "Español" };
const PER_PAGE = 10;
const BASE = { en: "/blog/", es: "/es/blog/" };
const HOME = { en: "/", es: "/es/" };
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const errors = [];
const fail = (msg) => errors.push(msg);

// ---- Fixed words: prose.js STRINGS (dates, reading time, pager, copy) and the site dictionaries (nav, blog) ----
const ctx = createContext({ window: {} });
runInContext(read("ds/prose.global.js"), ctx, { filename: "ds/prose.global.js" });
const P = ctx.window.DSProse;
const t = (key, lang, vars) => P.t(key, lang, vars);
const dict = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(read(`i18n/${l}.json`))]));

// Cache-busting, as build.mjs does: a short hash of each asset.
const v = (p) => createHash("sha256").update(readFileSync(join(ROOT, p))).digest("hex").slice(0, 8);
const ASSET = Object.fromEntries(["ds/design-system.css", "site.css", "blog/blog.css", "ds/prose.global.js", "blog/blog.js"].map((p) => [p, `/${p}?v=${v(p)}`]));
const STRIP = read("src/blog-strip.svg").trimEnd();
const STRIP_SLIM = read("src/blog-strip-slim.svg").trim();

// ---- Slugs and the usted check ----
const slugify = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Spanish on the site is "usted" (STANDARDS §4). These words only appear when the text says "tú".
const TU_WORDS = new Set(("tú tu tus contigo te tuyo tuya tuyos tuyas vos eres estás tienes puedes quieres sabes haces vas " +
  "necesitas debes crees piensas sientes dices hablas buscas usas lees escribes vienes conoces encuentras quieras puedas tengas " +
  "seas estés hagas sepas").split(" "));
const TU_ENCLITIC = /^[a-zñ]*[áéíóú][a-zñ]{0,3}(ate|ete|ite|ame|eme)$/; // regístrate, suscríbete, cuéntame
function checkUsted(text, where) {
  const plain = String(text ?? "")
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, " ")     // code isn't translated
    .replace(/`[^`\n]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "]")                   // link targets
    .replace(/<[^>]+>/g, " ");                      // tags (attribute text like aria-label is checked below)
  const attrs = [...String(text ?? "").matchAll(/(?:aria-label|alt|title)="([^"]*)"/g)].map((m) => m[1]).join(" ");
  for (const w of `${plain} ${attrs}`.toLowerCase().match(/[a-záéíóúñü]+/g) || []) {
    if (TU_WORDS.has(w) || TU_ENCLITIC.test(w)) fail(`${where}: "${w}" is the "tú" form; the Spanish uses "usted"`);
  }
}
for (const [k, s] of Object.entries(dict.es.blog)) checkUsted(s, `i18n/es.json blog.${k}`);

// ---- Tags ----
const TAGS = new Map();
for (const tag of yamlLoad(read("_content/tags.yml")).tags || []) {
  if (!tag.key || !tag.en || !tag.es) { fail(`_content/tags.yml: every tag needs key, en and es (${JSON.stringify(tag)})`); continue; }
  checkUsted(tag.es, `_content/tags.yml ${tag.key}`);
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

const inlineText = (tok) => (tok.children || []).map((c) => (c.type === "text" || c.type === "code_inline" ? c.content : c.type === "image" ? "" : "")).join("");

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
  const anchor = level >= 2 && level <= 4 ? `<a class="ds-anchor" href="#${esc(id)}" aria-label="${esc(t("anchor", env.lang))}">#</a>` : "";
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
function imgDims(src) {
  if (!src.startsWith("/") || src.startsWith("//")) return "";
  const file = join(ROOT, decodeURIComponent(src.split(/[?#]/)[0]));
  if (!existsSync(file)) return "";
  try { const d = imageSize(readFileSync(file)); return d.width && d.height ? ` width="${d.width}" height="${d.height}"` : ""; } catch { return ""; }
}
md.renderer.rules.image = (tokens, i, _o, env) => {
  const tok = tokens[i], src = tok.attrGet("src"), title = tok.attrGet("title");
  const alt = md.renderer.renderInlineAsText(tok.children || [], {}, env).trim();
  if (!alt) fail(`${env.file}: the image ${src} has no alt text`);
  const img = `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"${imgDims(src)}>`;
  return tok.meta?.figure ? `<figure>${img}<figcaption>${md.renderInline(title, env)}</figcaption></figure>\n` : img;
};

// Code: ```lang title="file" {3,5-7}. A title or a language gives the labelled block with Copy; `bare` gives a plain one.
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
    transformers: [{ line(node, n) { if (marks.has(n)) this.addClassToHast(node, "highlighted"); } }],
  });
  const label = title || (lang && lang !== "text" ? lang : "");
  if (/(^|\s)bare(\s|$)/.test(info) || !label) return `${html}\n`;
  return `<figure class="ds-codeblock"><figcaption><span>${esc(label)}</span><button class="ds-codeblock-copy">${esc(t("copy", env.lang))}</button></figcaption>${html}</figure>\n`;
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
  return ` <a href="#r${id}${sub > 0 ? `-${sub}` : ""}" aria-label="${esc(dict[env.lang].blog.backToText)}">↩</a>`;
};
md.core.ruler.push("footnote_tight", (state) => {
  const toks = state.tokens;
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].type !== "footnote_open") continue;
    let j = i + 1, paras = [];
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
  const post = { ...s, id: String(fm.id ?? ""), title: String(fm.title ?? ""), dek: String(fm.dek ?? ""), date,
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
  if (s.lang === "es") { checkUsted(`${post.title}\n${post.dek}\n${post.coverAlt}`, s.file); checkUsted(post.body, s.file); }
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
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

for (const p of posts) {
  p.live = !p.draft; // twins were checked above: live in one language means live in both
  p.url = `${BASE[p.lang]}${p.slug}/`;
  p.env = { lang: p.lang, file: p.file, headings: [] };
  p.html = renderBody(p.body, p.env);
  p.reading = P.readingTime(p.html.replace(/<[^>]+>/g, " "), p.lang);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const byDate = (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
const live = Object.fromEntries(LANGS.map((l) => [l, posts.filter((p) => p.lang === l && p.live).sort(byDate)]));
const SAMPLE = live.en.length === 0; // nothing live yet: the index shows the drafts as samples, noindex
const drafts = Object.fromEntries(LANGS.map((l) => [l, DRAFTS ? posts.filter((p) => p.lang === l && !p.live).sort(byDate) : []]));
const listed = Object.fromEntries(LANGS.map((l) => [l, SAMPLE ? drafts[l] : live[l]]));

// ---- Page parts ----
const ICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2305071a'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='%23ff3d8b' text-anchor='middle'%3ERJ%3C/text%3E%3C/svg%3E">`;
function head({ lang, title, description, path, alt, noindex, type = "website", image, imageAlt, published }) {
  const B = dict[lang].blog, other = lang === "en" ? "es" : "en";
  const links = [`<link rel="alternate" hreflang="${HTML_LANG[lang]}" href="${SITE}${path}">`];
  if (alt) links.push(`<link rel="alternate" hreflang="${HTML_LANG[other]}" href="${SITE}${alt}">`);
  if (alt || lang === "en") links.push(`<link rel="alternate" hreflang="x-default" href="${SITE}${lang === "en" ? path : alt}">`);
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}" data-brand="rod">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Rod Johnson</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex"><!-- a draft or a sample: not live -->\n' : ""}<link rel="canonical" href="${SITE}${path}">
${links.join("")}
<link rel="alternate" type="application/rss+xml" title="${esc(B.feedTitle)}" href="${SITE}${BASE[lang]}feed.xml">
<meta property="og:site_name" content="Rod Johnson"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${type}"><meta property="og:url" content="${SITE}${path}"><meta property="og:locale" content="${B.ogLocale}"><meta property="og:locale:alternate" content="${dict[other].blog.ogLocale}">
${image ? `<meta property="og:image" content="${esc(new URL(image, SITE).href)}"><meta property="og:image:alt" content="${esc(imageAlt)}">\n` : ""}${published ? `<meta property="article:published_time" content="${published}">\n` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
${ICON}
<link rel="stylesheet" href="/ds/fonts.css">
<link rel="stylesheet" href="${ASSET["ds/design-system.css"]}">
<link rel="stylesheet" href="${ASSET["site.css"]}">
<link rel="stylesheet" href="${ASSET["blog/blog.css"]}">
</head>
<body class="ds">`;
}
function bar(lang, otherUrl) {
  const n = dict[lang].nav, h = HOME[lang];
  const opts = LANGS.map((l) => `<option value="${l}" lang="${HTML_LANG[l]}"${l === lang ? " selected" : ""}>${NAMES[l]}</option>`).join("");
  return `<a class="skip" href="#main">${esc(n.skip)}</a>
<header class="bar">
  <a class="mark" href="${h}" aria-label="${esc(n.home)}">Rod Johnson</a>
  <nav aria-label="${esc(n.label)}"><a href="${h}#about">${esc(n.about)}</a><a href="${h}#work">${esc(n.work)}</a><a href="${h}#resume">${esc(n.resume)}</a><a href="${h}#building">${esc(n.building)}</a><a href="${BASE[lang]}" aria-current="page">${esc(n.blog)}</a></nav>
  <span class="ds-lang"><label><span class="ds-lang-label">${esc(n.language)}</span><select id="lang" aria-label="${esc(n.language)}" data-other="${otherUrl}">${opts}</select></label></span>
</header>`;
}
const foot = (lang) => `<footer class="foot col"><p class="ds-body-small ds-variant">${esc(dict[lang].footer.copy)}</p></footer>
<script src="${ASSET["ds/prose.global.js"]}"></script>
<script src="${ASSET["blog/blog.js"]}"></script>
</body>
</html>
`;
const chips = (p) => p.tags.map((k) => `<a class="ds-chip" href="${tagUrl(k, p.lang)}">${esc(TAGS.get(k).name[p.lang])}</a>`).join("");
const time = (p) => `<time datetime="${p.date}">${esc(P.postDate(p.date, p.lang))}</time>`;

// ---- Writing ----
const written = [];
function write(path, html) {
  const file = join(OUT, path.replace(/^\//, ""), path.endsWith("/") ? "index.html" : "");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written.push(path);
}
// The build owns blog/ and es/blog/: clear what it wrote last time (blog.css, blog.js and media/ are sources).
for (const [dir, keep] of [["blog", ["blog.css", "blog.js", "media"]], ["es/blog", []]]) {
  const abs = join(OUT, dir);
  if (!existsSync(abs)) continue;
  for (const name of readdirSync(abs)) if (!keep.includes(name)) rmSync(join(abs, name), { recursive: true, force: true });
}

// ---- Index pages: /blog/, /blog/page/N/, /blog/tag/<tag>/ ----
function listPages(lang, items, { base, otherBase, title, heading, tagKey }) {
  const B = dict[lang].blog, total = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const used = [...new Set(listed[lang].flatMap((p) => p.tags))].sort((a, b) => TAGS.get(a).name[lang].localeCompare(TAGS.get(b).name[lang], HTML_LANG[lang]));
  const filters = used.length ? `  <ul class="filters" aria-label="${esc(B.tags)}"><li><a class="ds-chip" href="${BASE[lang]}"${tagKey ? "" : ' aria-current="page"'}>${esc(B.all)}</a></li>${used.map((k) => `<li><a class="ds-chip" href="${tagUrl(k, lang)}"${k === tagKey ? ' aria-current="page"' : ""}>${esc(TAGS.get(k).name[lang])}</a></li>`).join("")}</ul>\n` : "";
  for (let n = 1; n <= total; n++) {
    const path = n === 1 ? base : `${base}page/${n}/`;
    const alt = n === 1 ? otherBase : `${otherBase}page/${n}/`;
    const page = items.slice((n - 1) * PER_PAGE, n * PER_PAGE);
    const list = page.length ? `  <ul class="ds-post-list">
${page.map((p) => `    <li>
      ${time(p)}
      <h2><a href="${p.url}">${esc(p.title)}</a></h2>
      <p>${esc(p.dek)}</p>
      <div class="ds-post-tags">${chips(p)}</div>
    </li>`).join("\n")}
  </ul>\n` : `  <p class="ds-body-large ds-variant">${esc(t("empty", lang))}</p>\n`;
    const newer = n > 1 ? `<a class="ds-btn text" href="${n === 2 ? base : `${base}page/${n - 1}/`}">← ${esc(t("newer", lang))}</a>` : "";
    const older = n < total ? `<a class="ds-btn text" href="${base}page/${n + 1}/">${esc(t("older", lang))} →</a>` : "";
    const more = total > 1 ? `  <nav class="more" aria-label="${esc(B.pages)}">${newer}<span class="ds-body-medium ds-variant">${esc(t("page", lang, { n, total }))}</span>${older}</nav>\n` : "";
    const pageTitle = n > 1 ? `${title} · ${t("page", lang, { n, total })}` : title;
    write(path, `${head({ lang, title: pageTitle, description: tagKey ? heading : B.description, path, alt, noindex: SAMPLE || !items.length })}
${bar(lang, alt)}
<section class="strip" aria-labelledby="blog-title">
${STRIP}
  <div class="col"><h1 id="blog-title">${esc(B.title)}</h1><p>${esc(heading)}</p></div>
</section>
<main id="main" class="col ix blog">
${SAMPLE && items.length ? `  <p class="ds-banner sample">${esc(B.sample)}</p>\n` : ""}${filters}${list}${more}</main>
${foot(lang)}`);
  }
}
for (const lang of LANGS) {
  const other = lang === "en" ? "es" : "en", B = dict[lang].blog;
  listPages(lang, listed[lang], { base: BASE[lang], otherBase: BASE[other], title: B.title, heading: B.tagline });
  for (const key of new Set(listed[lang].flatMap((p) => p.tags))) {
    const heading = t("tagged", lang, { tag: TAGS.get(key).name[lang] });
    listPages(lang, listed[lang].filter((p) => p.tags.includes(key)), { base: tagUrl(key, lang), otherBase: tagUrl(key, other), title: heading, heading, tagKey: key });
  }
}

// ---- Post pages ----
function postPage(p, list) {
  const i = list.indexOf(p), prev = list[i - 1], next = list[i + 1];
  const other = p.lang === "en" ? "es" : "en";
  const twinUrl = p.twin && (p.twin.live || !p.live) && (DRAFTS || p.twin.live) ? p.twin.url : BASE[other];
  const h2s = p.env.headings.filter((h) => h.level === 2);
  const toc = h2s.length >= 4 && p.toc !== false // 4+ h2s only (Designer 11/21); front matter can only turn it off
    ? `<details class="ds-toc"><summary>${esc(t("toc", p.lang))}</summary><ol>${h2s.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join("")}</ol></details>` : "";
  const cover = p.cover ? `\n    <figure class="ds-post-cover"><img src="${esc(p.cover)}" alt="${esc(p.coverAlt)}"${imgDims(p.cover)} fetchpriority="high"></figure>` : "";
  const pager = prev || next ? `<nav class="ds-pager" aria-label="${esc(dict[p.lang].blog.posts)}">${prev ? `<a class="prev" href="${prev.url}"><small>← ${esc(t("prev", p.lang))}</small>${esc(prev.title)}</a>` : ""}${next ? `<a class="next" href="${next.url}"><small>${esc(t("next", p.lang))} →</small>${esc(next.title)}</a>` : ""}</nav>` : "";
  write(p.url, `${head({ lang: p.lang, title: p.title, description: p.dek, path: p.url, alt: twinUrl === BASE[other] ? null : twinUrl, noindex: !p.live, type: "article", image: p.cover, imageAlt: p.coverAlt, published: p.date })}
${bar(p.lang, twinUrl)}
<div class="strip slim" aria-hidden="true">${STRIP_SLIM}</div>
<main id="main" class="col post blog">
  <article>
    <header class="ds-post-head">
      <p class="ds-post-kicker">${p.tags.map((k) => `<a href="${tagUrl(k, p.lang)}">${esc(TAGS.get(k).name[p.lang])}</a>`).join("")}</p>
      <h1 class="ds-post-title">${esc(p.title)}</h1>
      <p class="ds-post-dek">${esc(p.dek)}</p>
      <p class="ds-post-meta">${time(p)}<span>${esc(p.reading)}</span><a class="ds-post-lang" href="${twinUrl}" lang="${HTML_LANG[other]}">${esc(t("other_lang", p.lang))}</a></p>
    </header>${cover}
    ${toc}
    <div class="ds-prose">
${p.html}    </div>
    <footer class="post-foot"><div class="ds-post-tags">${chips(p)}</div>${pager}</footer>
  </article>
</main>
${foot(p.lang)}`);
}
for (const lang of LANGS) {
  for (const p of live[lang]) postPage(p, live[lang]);
  for (const p of drafts[lang]) postPage(p, drafts[lang]);
}

// ---- RSS, one feed per language (live posts only) ----
const rfc822 = (d) => new Date(`${d}T12:00:00Z`).toUTCString();
const xml = (s) => esc(s).replace(/'/g, "&apos;");
for (const lang of LANGS) {
  const B = dict[lang].blog, items = live[lang].slice(0, 20);
  writeFileSync(join(OUT, BASE[lang].slice(1), "feed.xml"), `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(B.feedTitle)}</title>
<link>${SITE}${BASE[lang]}</link>
<description>${xml(B.description)}</description>
<language>${HTML_LANG[lang]}</language>
<atom:link href="${SITE}${BASE[lang]}feed.xml" rel="self" type="application/rss+xml"/>
${items.length ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>\n` : ""}${items.map((p) => `<item>
<title>${xml(p.title)}</title>
<link>${SITE}${p.url}</link>
<guid isPermaLink="true">${SITE}${p.url}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
<description>${xml(p.dek)}</description>
${p.tags.map((k) => `<category>${xml(TAGS.get(k).name[lang])}</category>`).join("\n")}
</item>
`).join("")}</channel>
</rss>
`);
  written.push(`${BASE[lang]}feed.xml`);
}

// ---- Sitemap: the home and privacy pages, plus the live blog (drafts and samples are noindex, so they stay out) ----
const pair = (en, es, lastmod) => [[en, es], [es, en]].map(([a, b]) => `<url><loc>${SITE}${a}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<xhtml:link rel="alternate" hreflang="en" href="${SITE}${en}"/><xhtml:link rel="alternate" hreflang="es-419" href="${SITE}${es}"/></url>`).join("\n");
const urls = [pair("/", "/es/"), pair("/privacy/", "/privacy/es/")];
if (!SAMPLE) {
  urls.push(pair(BASE.en, BASE.es, live.en[0]?.date));
  for (const p of live.en) urls.push(pair(p.url, p.twin.url, p.date));
}
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`);
written.push("/sitemap.xml");

console.log(`blog: ${live.en.length} live post(s), ${drafts.en.length + drafts.es.length} draft page(s)${SAMPLE ? " (index shows the drafts as samples)" : ""}; wrote ${written.length} files under ${OUT === ROOT ? "the repo" : OUT}`);
