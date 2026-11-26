// Skew protection for deploys (Rod 11/25, DECISIONS: "When we're updating, we want to make sure we don't kick people
// offline"). A deploy to Static Web Apps replaces the whole site, so a page still open from the previous build would ask
// for /_next/static files that no longer exist (a chunk-load error mid-quiz or mid-sign-in). Before each deploy this
// script puts the /_next/static files that recent deploys served back into out/, next to the new build's files, so old
// pages keep loading until their visitor's next full page load.
//
//   node scripts/skew.mjs <out> <store> [--days 7] [--max-mb 60]
//
// <store> is the deploy job's actions/cache directory for this environment (production or staging): manifest.json plus
// files/<path under out>. The manifest records, for every file, the last deploy whose own build contained it. A file
// leaves the store (and the site) once no build has shipped it for --days days, or earliest-first when the carried files
// pass --max-mb. Only regular files under _next/static/ are ever read or written; the new build's files always win (they
// are never overwritten), and a missing or unreadable store just means this deploy carries nothing.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, lstatSync, rmSync, existsSync, realpathSync } from "node:fs";
import { join, resolve, sep, dirname } from "node:path";

const [outArg, storeArg, ...rest] = process.argv.slice(2);
if (!outArg || !storeArg) { console.error("usage: node scripts/skew.mjs <out> <store> [--days 7] [--max-mb 60]"); process.exit(2); }
const opt = (name, dflt) => { const i = rest.indexOf(name); const v = i < 0 ? dflt : Number(rest[i + 1]); if (!(v > 0)) throw new Error(`bad ${name}`); return v; };
const DAYS = opt("--days", 7), MAX_BYTES = opt("--max-mb", 60) * 1024 * 1024;
const OUT = resolve(outArg), STORE = resolve(storeArg), FILES = join(STORE, "files"), MANIFEST = join(STORE, "manifest.json");
const ROOT = "_next/static/";
const now = Date.now(), cutoff = now - DAYS * 86_400_000;

// A path we accept: relative, under _next/static/, no "..", no backslash or control characters (Next's chunk names do
// include route groups and segments such as app/(en)/[slug]/page-<hash>.js).
const okRel = (rel) => typeof rel === "string" && rel.startsWith(ROOT) && !/[\\\0-\x1f]/.test(rel) && !rel.split("/").some((s) => s === ".." || s === "." || s === "");
const inside = (base, rel) => { const p = resolve(base, rel); if (!p.startsWith(base + sep)) throw new Error(`path escapes ${base}: ${rel}`); return p; };
const isFile = (p) => { try { return lstatSync(p).isFile(); } catch { return false; } };

// Symlinks (Security 11/25, PR #84): the store comes from a cache that the build job's npm scripts could in principle
// write, so a symlinked *directory* inside it must never let a read or write leave the store (or out/). Two layers:
// every symlink in the store is deleted before anything else, at any depth, without following it; and every read and
// write checks that the real path of its directory is still inside the real path of its base.
function purgeLinks(dir) {
  let st; try { st = lstatSync(dir); } catch { return 0; }
  if (st.isSymbolicLink()) { rmSync(dir); return 1; }
  if (!st.isDirectory()) return 0;
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name), s2 = lstatSync(p);
    if (s2.isSymbolicLink()) { rmSync(p); n++; } else if (s2.isDirectory()) n += purgeLinks(p);
  }
  return n;
}
function real(base, rel, write) {
  const p = inside(base, rel), d = dirname(p);
  if (write) mkdirSync(d, { recursive: true });
  const rb = realpathSync(base), rd = realpathSync(d);
  if (rd !== rb && !rd.startsWith(rb + sep)) throw new Error(`path leaves ${base} through a link: ${rel}`);
  if (lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`link at ${rel}`);
  return p;
}

function list(base) {
  const found = new Map(), start = join(base, ROOT);
  if (!existsSync(start)) return found;
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name), st = lstatSync(p);
      if (st.isSymbolicLink()) continue; // never follow or copy links
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) { const rel = p.slice(base.length + 1).split(sep).join("/"); if (okRel(rel)) found.set(rel, st.size); }
    }
  })(start);
  return found;
}
const stored = (rel) => { try { return isFile(real(FILES, rel, false)); } catch { return false; } };
// Every copy is between two checked real paths: [base, rel] pairs.
const copy = ([fromBase, rel], [toBase]) => copyFileSync(real(fromBase, rel, false), real(toBase, rel, true));

for (const d of [OUT, STORE]) if (lstatSync(d, { throwIfNoEntry: false })?.isSymbolicLink()) { console.error(`skew: ${d} is a link; refusing`); process.exit(1); }
const links = purgeLinks(STORE) + purgeLinks(join(OUT, "_next")); // no trailing slash: lstat must see the link itself
if (links) console.log(`skew: removed ${links} symlink(s) before starting (never expected)`);

let manifest = {};
try {
  const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
  if (m && m.version === 1 && m.files && typeof m.files === "object") manifest = m.files;
} catch { /* first deploy, or the cache was evicted: carry nothing this time */ }

// 1. This build's files: shipped now. Keep a copy for the next deploys.
const current = list(OUT);
if (current.size === 0) { console.error(`skew: ${OUT}/${ROOT} is empty; refusing to touch the store`); process.exit(1); }
for (const [rel, bytes] of current) {
  manifest[rel] = { last: now, bytes };
  copy([OUT, rel], [FILES]);
}

// 2. Earlier builds' files still inside the window, newest first, up to the size cap.
const older = Object.entries(manifest)
  .filter(([rel, m]) => !current.has(rel) && okRel(rel) && m && Number.isFinite(m.last) && m.last >= cutoff && stored(rel))
  .sort((a, b) => b[1].last - a[1].last);
const keep = new Set(current.keys());
let carried = 0, carriedBytes = 0, capped = 0;
for (const [rel] of older) {
  const size = lstatSync(real(FILES, rel, false)).size;
  if (carriedBytes + size > MAX_BYTES) { capped++; continue; }
  copy([FILES, rel], [OUT]); // never an existing out/ file: current files aren't in `older`
  keep.add(rel); carried++; carriedBytes += size;
}

// 3. Forget everything else, and delete stored files nothing points to any more.
for (const rel of Object.keys(manifest)) if (!keep.has(rel)) delete manifest[rel];
let dropped = 0;
for (const rel of list(FILES).keys()) {
  if (!keep.has(rel)) { rmSync(real(FILES, rel, false)); dropped++; }
}
mkdirSync(STORE, { recursive: true });
writeFileSync(MANIFEST, JSON.stringify({ version: 1, updated: new Date(now).toISOString(), files: manifest }));

console.log(`skew: ${current.size} file(s) in this build; carried ${carried} older file(s) (${(carriedBytes / 1048576).toFixed(1)} MB) from the last ${DAYS} day(s)` +
  `${capped ? `; ${capped} skipped over the ${MAX_BYTES / 1048576} MB cap` : ""}; ${dropped} expired file(s) removed from the store`);
