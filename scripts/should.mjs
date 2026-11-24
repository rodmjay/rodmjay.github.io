// Adds the Should page at /should/: Product Manager's static site (repo rodmjay/should, the folder product/site in the
// personal workspace), copied byte-identical, never ported, by the shared copier in scripts/sites.mjs (its `should`
// entry: what's skipped, the demo routes and the demo's style exception). Runs after postbuild, whose guards cover the
// Next output only: the Should page has inline <script>s, so it gets its own route and CSP.
// Usage: node scripts/should.mjs <src>, or SHOULD_SRC=<src> npm run build. With neither, it leaves out/ as it is.
import { existsSync } from "node:fs";
import { addSite } from "./sites.mjs";

const src = process.argv[2] || process.env.SHOULD_SRC;
if (!src && !existsSync("out/should/index.html")) {
  console.log("should: no source (SHOULD_SRC or an argument), /should/ not added");
  process.exit(0);
}
addSite("should", src);
