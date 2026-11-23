// After `next build`: tidies out/ for Static Web Apps and checks it.
// - Removes the placeholder pages a dynamic route builds when it has nothing to list (Next's static export refuses an
//   empty generateStaticParams, so src/zones/routes.tsx gives it one placeholder that 404s: page/0, tag/none, none).
// - Removes out/404/ (out/404.html is the 404; staticwebapp.config.json serves it).
// - Fails if any other page is an error page, or if the 404 or a feed is missing.
import { readdirSync, readFileSync, rmSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";
const PLACEHOLDER = /\/(page\/0|tag\/none|none)$/;
const bad = [];
let pruned = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    const rel = `/${p.slice(OUT.length + 1)}`;
    const html = join(p, "index.html");
    if (existsSync(html) && readFileSync(html, "utf8").includes('id="__next_error__"')) {
      if (PLACEHOLDER.test(rel)) { rmSync(p, { recursive: true, force: true }); pruned++; continue; }
      bad.push(`${rel}/ is an error page`);
    }
    walk(p);
    // What's left of a placeholder (its RSC payload files, or nothing), and folders the pruning emptied.
    const left = readdirSync(p);
    if ((PLACEHOLDER.test(rel) && !left.includes("index.html")) || left.length === 0) {
      rmSync(p, { recursive: true, force: true });
    }
  }
}
rmSync(join(OUT, "404"), { recursive: true, force: true });
walk(OUT);
for (const f of ["404.html", "index.html", "es/index.html", "blog/feed.xml", "es/blog/feed.xml", "sitemap.xml", "robots.txt", "admin/index.html", "staticwebapp.config.json"])
  if (!existsSync(join(OUT, f))) bad.push(`out/${f} is missing`);
if (bad.length) { console.error(`postbuild:\n${bad.join("\n")}`); process.exit(1); }
console.log(`postbuild: out/ is ready (${pruned} placeholder page(s) removed)`);
