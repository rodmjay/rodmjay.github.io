// A tiny static server for out/ that behaves like Static Web Apps with our config: a folder serves its index.html,
// a folder without the trailing slash redirects to it, and anything missing gets 404.html with a 404.
//   node tests/serve.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".yml": "text/yaml" };
const port = Number(process.argv[2] || 4321);

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, path);
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!path.endsWith("/")) { res.writeHead(301, { location: `${path}/${url.search}` }); return res.end(); }
      file = join(file, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(await readFile(join(ROOT, "404.html")));
  }
}).listen(port, () => console.log(`serving out/ on http://localhost:${port}`));
