// Before `next build`: with CMS_SOURCE=payload, fetch the published blog from the CMS (psh ADR 0058, docs/adr/0003) and
// write it to .cms/snapshot.json, which src/lib/blog-source.mjs reads instead of _content/. Media files are downloaded
// into public/blog/media/<filename>, the address posts link to, so the static export serves them like any other file
// and nothing is hot-linked from the CMS. Without CMS_SOURCE=payload it does nothing: the markdown stays the source.
//
// One fetch per collection, before the build, so Next's build workers never call the CMS and a cold CMS (it scales to
// zero) is waited for once, with retries for up to CMS_WAIT_SECONDS (default 240). Anything off (an HTTP error, a shape
// the site can't read, a media file whose name isn't a plain file name) fails the build: a deploy never goes out with a
// half-fetched blog.
//
// CMS_API: the CMS's base URL (https://…, or http://127.0.0.1 for a local CMS). Reads are anonymous: the CMS serves
// published posts, tags and media to anyone, and nothing else.
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = ".cms";
if (process.env.CMS_SOURCE !== "payload") {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true }); // never a stale snapshot in markdown mode
  process.exit(0);
}
const API = String(process.env.CMS_API || "").replace(/\/$/, "");
if (!/^https:\/\/[^/]+$|^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API)) {
  console.error("cms-snapshot: CMS_SOURCE=payload needs CMS_API=https://<host> (or http://127.0.0.1:<port> locally)");
  process.exit(1);
}
const WAIT_MS = Number(process.env.CMS_WAIT_SECONDS || 240) * 1000;

async function get(path, as = "json") {
  const started = Date.now();
  let wait = 2000;
  for (;;) {
    let why;
    try {
      const res = await fetch(`${API}${path}`, { headers: { Accept: as === "json" ? "application/json" : "*/*" }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
      why = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 408 && res.status !== 429) throw new Error(`${path}: ${why}`);
    } catch (e) {
      if (String(e.message).startsWith(path)) throw e;
      why = e.message;
    }
    if (Date.now() - started > WAIT_MS) throw new Error(`${path}: gave up after ${Math.round((Date.now() - started) / 1000)} s (${why})`);
    console.log(`cms-snapshot: ${path}: ${why}; retrying (the CMS may be starting)`);
    await new Promise((r) => setTimeout(r, wait));
    wait = Math.min(wait * 2, 20_000);
  }
}

const list = (collection, where = "") => get(`/api/${collection}?locale=all&depth=0&pagination=false&sort=id${where}`).then((r) => {
  if (!Array.isArray(r?.docs)) throw new Error(`/api/${collection}: no docs`);
  return r.docs;
});

const [tags, media, posts] = await Promise.all([
  list("tags"),
  list("media"),
  list("posts", "&where[_status][equals]=published"),
]);

const loc = (v, field, key) => {
  if (!v || typeof v !== "object") throw new Error(`cms-snapshot: ${key}: ${field} isn't localized (fetch with locale=all)`);
  return v;
};
const snapshot = {
  source: API,
  tags: tags.map((t) => ({ id: t.id, key: t.key, ...loc(t.name, "name", `tag ${t.key}`) })),
  media: media.map((m) => {
    if (!/^[\w.-]+$/.test(m.filename || "") || m.filename.startsWith(".")) throw new Error(`cms-snapshot: media ${m.id}: unsafe file name ${JSON.stringify(m.filename)}`);
    return { id: m.id, filename: m.filename, url: m.url, alt: m.alt };
  }),
  posts: posts.map((p) => ({
    id: p.id, key: p.key, date: p.date, tags: p.tags || [], cover: p.cover ?? null, toc: p.toc,
    title: loc(p.title, "title", `post ${p.key}`), slug: loc(p.slug, "slug", `post ${p.key}`), dek: loc(p.dek, "dek", `post ${p.key}`),
    body: loc(p.body, "body", `post ${p.key}`), coverAlt: p.coverAlt && typeof p.coverAlt === "object" ? p.coverAlt : {},
  })),
};

mkdirSync("public/blog/media", { recursive: true });
for (const m of snapshot.media) {
  const path = m.url && m.url.startsWith("/") ? m.url : `/api/media/file/${encodeURIComponent(m.filename)}`;
  writeFileSync(join("public/blog/media", m.filename), await get(path, "bytes"));
}
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`cms-snapshot: ${snapshot.posts.length} published posts, ${snapshot.tags.length} tags, ${snapshot.media.length} media files from ${API}`);
