// scripts/skew.mjs: carries earlier builds' /_next/static files into out/, never over the new build, and forgets them
// after --days. Run: node --test tests/skew.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, symlinkSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const SCRIPT = join(process.cwd(), "scripts/skew.mjs");
const put = (base, rel, body) => { mkdirSync(dirname(join(base, rel)), { recursive: true }); writeFileSync(join(base, rel), body); };
const run = (out, store, ...args) => execFileSync(process.execPath, [SCRIPT, out, store, ...args], { encoding: "utf8" });
const build = (dir, files) => { rmSync(dir, { recursive: true, force: true }); for (const [rel, body] of Object.entries(files)) put(dir, rel, body); };

test("carries the previous build's chunks, keeps the new ones, and leaves pages alone", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store");
  build(out, { "_next/static/chunks/a-1.js": "A1", "_next/static/chunks/app/(en)/[slug]/page-1.js": "P1", "_next/static/BUILD1/_buildManifest.js": "M1", "index.html": "<h1>1" });
  run(out, store);
  build(out, { "_next/static/chunks/a-2.js": "A2", "_next/static/chunks/app/(en)/[slug]/page-1.js": "P1-new", "_next/static/BUILD2/_buildManifest.js": "M2", "index.html": "<h1>2" });
  const log = run(out, store);
  assert.match(log, /carried 2 older file/);
  assert.equal(readFileSync(join(out, "_next/static/chunks/a-1.js"), "utf8"), "A1");
  assert.equal(readFileSync(join(out, "_next/static/BUILD1/_buildManifest.js"), "utf8"), "M1");
  assert.equal(readFileSync(join(out, "_next/static/chunks/app/(en)/[slug]/page-1.js"), "utf8"), "P1-new", "the new build wins");
  assert.equal(readFileSync(join(out, "index.html"), "utf8"), "<h1>2", "only _next/static is carried");
});

test("forgets files no build has shipped for --days days", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store");
  build(out, { "_next/static/chunks/old.js": "O" });
  run(out, store);
  const m = JSON.parse(readFileSync(join(store, "manifest.json"), "utf8"));
  m.files["_next/static/chunks/old.js"].last = Date.now() - 8 * 86_400_000;
  writeFileSync(join(store, "manifest.json"), JSON.stringify(m));
  build(out, { "_next/static/chunks/new.js": "N" });
  assert.match(run(out, store, "--days", "7"), /carried 0 older file.*1 expired file/);
  assert.ok(!existsSync(join(out, "_next/static/chunks/old.js")));
  assert.ok(!existsSync(join(store, "files/_next/static/chunks/old.js")));
});

test("stays under the size cap, newest first", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store");
  const mb = "x".repeat(700 * 1024);
  build(out, { "_next/static/chunks/b1.js": mb }); run(out, store);
  build(out, { "_next/static/chunks/b2.js": mb }); run(out, store);
  build(out, { "_next/static/chunks/b3.js": "small" });
  assert.match(run(out, store, "--max-mb", "1"), /carried 1 older file.*1 skipped over the 1 MB cap/);
  assert.ok(existsSync(join(out, "_next/static/chunks/b2.js")), "the most recent earlier build is kept");
  assert.ok(!existsSync(join(out, "_next/static/chunks/b1.js")));
});

test("ignores a tampered manifest and symlinks; a missing store carries nothing", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store");
  build(out, { "_next/static/chunks/a.js": "A" });
  assert.match(run(out, store), /carried 0 older file/);
  const m = JSON.parse(readFileSync(join(store, "manifest.json"), "utf8"));
  m.files["../../evil.js"] = { last: Date.now() };
  m.files["_next/static/../../../evil.js"] = { last: Date.now() };
  m.files["index.html"] = { last: Date.now() };
  writeFileSync(join(store, "manifest.json"), JSON.stringify(m));
  put(store, "files/index.html", "evil");
  symlinkSync("/etc/hostname", join(store, "files/_next/static/chunks/link.js"));
  m.files["_next/static/chunks/link.js"] = { last: Date.now() };
  writeFileSync(join(store, "manifest.json"), JSON.stringify(m));
  build(out, { "_next/static/chunks/b.js": "B" });
  assert.match(run(out, store), /carried 1 older file/);
  assert.ok(existsSync(join(out, "_next/static/chunks/a.js")));
  assert.ok(!existsSync(join(out, "index.html")));
  assert.ok(!existsSync(join(out, "_next/static/chunks/link.js")));
  assert.ok(!existsSync(join(t, "evil.js")));
});

test("refuses an empty build", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out");
  mkdirSync(out);
  assert.throws(() => run(out, join(t, "store")));
});

test("a symlinked directory in the store can't read from or write outside it (Security 11/25)", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store"), elsewhere = join(t, "elsewhere");
  build(out, { "_next/static/chunks/a.js": "A" });
  run(out, store);
  // A poisoned cache: files/_next/static/chunks is a link to a directory outside the store, holding a "chunk".
  put(elsewhere, "secret.js", "outside");
  rmSync(join(store, "files/_next/static/chunks"), { recursive: true });
  symlinkSync(elsewhere, join(store, "files/_next/static/chunks"));
  const m = JSON.parse(readFileSync(join(store, "manifest.json"), "utf8"));
  m.files["_next/static/chunks/secret.js"] = { last: Date.now() };
  writeFileSync(join(store, "manifest.json"), JSON.stringify(m));
  build(out, { "_next/static/chunks/b.js": "B" });
  assert.match(run(out, store), /removed 1 symlink.*\n.*carried 0 older file/s);
  assert.ok(!existsSync(join(out, "_next/static/chunks/secret.js")), "nothing from outside reaches out/");
  assert.deepEqual(readdirSync(elsewhere), ["secret.js"], "nothing is written outside the store");
  assert.ok(existsSync(join(store, "files/_next/static/chunks/b.js")));
});

test("a symlinked _next/static in out/ is refused or cleared before use", () => {
  const t = mkdtempSync(join(tmpdir(), "skew-")), out = join(t, "out"), store = join(t, "store"), elsewhere = join(t, "elsewhere");
  put(elsewhere, "chunks/x.js", "X");
  mkdirSync(join(out, "_next"), { recursive: true });
  symlinkSync(elsewhere, join(out, "_next/static"));
  assert.throws(() => run(out, store)); // the link is removed, leaving an empty build: refused
  assert.deepEqual(readdirSync(join(elsewhere, "chunks")), ["x.js"]);
});
