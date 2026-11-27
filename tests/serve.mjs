// A tiny static server for out/ that behaves like Static Web Apps with our config: a folder serves its index.html,
// a folder without the trailing slash redirects to it, and anything missing gets 404.html with a 404. It sends the
// headers from out/staticwebapp.config.json (globalHeaders, then the first matching route's headers win: route
// evaluation stops at the first match), the CSP included, so the tests see what the browser sees on Azure. A route's
// rewrite serves its target with a 200 (the /should/demo/* deep links); a redirect answers with its statusCode.
//   node tests/serve.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".pdf": "application/pdf", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".yml": "text/yaml" };
const port = Number(process.argv[2] || 4321);
const CONFIG = JSON.parse(await readFile(join(ROOT, "staticwebapp.config.json"), "utf8"));
const routeMatch = (route, path) => (route.endsWith("/*") ? path.startsWith(route.slice(0, -1)) || path === route.slice(0, -2) : path === route);
const routeFor = (path) => (CONFIG.routes || []).find((r) => routeMatch(r.route, path));
const headersFor = (path, extra) => ({ ...CONFIG.globalHeaders, ...routeFor(path)?.headers, ...extra });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, path);
  // A route's redirect answers before any file (the old /rvp/ paths, Rod 11/26). Static Web Apps carries no wildcard tail.
  const moved = routeFor(path)?.redirect;
  if (moved) { res.writeHead(routeFor(path).statusCode || 302, headersFor(path, { location: moved })); return res.end(); }
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!path.endsWith("/")) { res.writeHead(301, headersFor(path, { location: `${path}/${url.search}` })); return res.end(); }
      file = join(file, "index.html");
    }
  } catch {}
  try {
    const rewrite = routeFor(path)?.rewrite;
    if (rewrite) file = join(ROOT, rewrite);
    const body = await readFile(file);
    res.writeHead(200, headersFor(path, { "content-type": TYPES[extname(file)] || "application/octet-stream" }));
    res.end(body);
  } catch {
    res.writeHead(404, headersFor(path, { "content-type": TYPES[".html"] }));
    res.end(await readFile(join(ROOT, "404.html")));
  }
// Loopback only: a test server never listens on the LAN (IT Guy 11/27).
}).listen(port, "127.0.0.1", () => console.log(`serving out/ on http://127.0.0.1:${port}`));
