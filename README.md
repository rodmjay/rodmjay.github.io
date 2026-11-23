# rodmjay.com

Rod Johnson's personal site: a Next.js 15 static export (`output: 'export'`), served by Azure Static Web Apps (Free).
Decision and the ordered cutover checklist: [docs/adr/0002-azure-static-web-apps.md](docs/adr/0002-azure-static-web-apps.md).

**Branches:** `main` is the Next.js source and deploys to production; `next` deploys to the named preview environment
"staging". Pull requests into `main` build and test only (the required `build` check). GitHub Pages serves the frozen
`pages-legacy` branch until DNS moves (docs/adr/0002); the root `CNAME` stays until Pages is retired.

## Layout

- `src/app/(en)` and `src/app/(es)` are the two root layouts, one per language, so `<html lang>` is right in the HTML
  (`en`, `es-419`). Inside each, route groups own their pages: `(home)` (home and privacy), `(blog)`, `(recipes)`.
- `src/zones/` holds each section's components: `shell` (header, nav, footer, mounted once), `home`, `resume` (the
  form), `blog`, `recipes`. `src/zones/routes.tsx` builds every page in both languages.
- `src/lib/` runs at build time only: the dictionaries and checks (`site.mjs`), the blog (`blog.mjs`), the recipes
  (`recipes.mjs`), twins for the language menu (`routes.mjs`).
- `public/` is copied as is: the design system (`ds/`), `site.css`, `blog/blog.css`, `recipes/recipes.css`, blog
  images (`blog/media/`), recipe photos (`recipes/images/`), `admin/`, `robots.txt`, `staticwebapp.config.json`.
- Every in-app link is a Next `<Link>`, and the header lives in the root layout, so moving between pages never
  reloads or jumps. Switching language is a full load (the other root layout), as before.

## Copy (EN and es-419, usted)

`i18n/en.json` and `i18n/es.json` hold every fixed word. Both must have the same keys: the build fails on a missing one.

## Build and test

```sh
npm ci
npm run build        # next build, then scripts/postbuild.mjs tidies and checks out/
SHOULD_SRC=<clone of rodmjay/should> npm run build   # the same, plus the Should page at out/should/
npm run test:urls    # every URL the Pages site served still exists in out/
npm run test:e2e     # Playwright: axe (WCAG 2.1 AA) at 1280 and 375 in EN and ES, plus click-through with no reload
```

## Blog (markdown, $0)

- Posts live in `_content/posts/en/<slug>.md` and `_content/posts/es/<slug>.md`, tied by the same `id` in the front
  matter (title, dek ≤180 characters, date, tags, cover and cover_alt, toc, draft). Tags and their EN/ES names:
  `_content/tags.yml`. Images: `public/blog/media/` (served at `/blog/media/`).
- `src/lib/blog.mjs` keeps the rules and rendering of the old build script: markdown-it and Shiki at build time, RSS per
  language at `/blog/feed.xml` and `/es/blog/feed.xml`, `sitemap.xml`, hreflang. Designer's spec:
  design/specs/rodmjay-blog.md.
- The build fails on: a live post without its twin, an image or `<svg role="img">` without alt text, an unknown tag, a
  dek over 180 characters, or Spanish in the "tú" form (the site uses usted).
- A post goes live only when both languages say `draft: false`. Drafts build as noindex pages and stay out of the feeds
  and the sitemap; the index lists them as samples only while nothing is live. `BLOG_DRAFTS=0` leaves them out.
- Editor: **/admin/** (Sveltia CMS, pinned with SRI, noindex). Sign in with "Sign In Using Access Token": a GitHub
  fine-grained token for this repository only, Contents read and write. It commits markdown to main; after cutover
  main is the Next.js source and the deploy workflow builds it.
- **Moving to Payload CMS** (docs/adr/0003, psh ADR 0058). With the repo variables `CMS_SOURCE=payload` and
  `CMS_API=https://<cms host>`, `scripts/cms-snapshot.mjs` fetches the published posts, tags and media before
  `next build` (into `.cms/snapshot.json` and `public/blog/media/`), and `src/lib/blog-source.mjs` hands them to the
  same rules and rendering. Unset, the markdown above is the source. Publishing in the CMS runs this workflow on main.
  `tests/cms-parity.mjs` proves both sources give the same site (see the ADR). Sveltia retires at cutover.

## Recipes

- Read at build time only from the `public-recipes` Edge Function (`RECIPES_API`, GET, `?lang=en|es`). Until it returns
  rows, the build uses the three sample dishes in `_content/recipes/sample.json`.
- Two switches (repo variables in CI): `RECIPES_LIVE=1` adds "Recipes" to the nav; `RECIPES_APPROVED=1` removes the
  Sample chip and the noindex and adds the recipes to the sitemap, together.
- The build fails on a recipe without both languages, Spanish that isn't usted, alcohol, coffee or tea, a private
  section ("For Rod", health numbers), or, once approved, an `[ES TODO` placeholder.
- Photos are self-hosted: `python3 scripts/recipe-images.py <folder> <slug>…` writes WebP at 1600 and 800 px (never
  wider than the source) and a JPEG fallback into `public/recipes/images/`. Dish photos only.

## Design system

`public/ds/` is a stripped public copy of the shared design system (rod brand, self-hosted fonts), stamped with its
version in `public/ds/VERSION`; the build refuses a copy that isn't the pinned version in `src/lib/ds-version.mjs`.
A bump is one command: `DS_SRC=<the design system's git URL> scripts/sync-design-system.sh <version>`.

## Security headers

`public/staticwebapp.config.json` sends a strict Content-Security-Policy (`script-src 'self'`, `style-src 'self'`, no
inline or eval code; `connect-src` only the site and the Supabase functions host for the resume form;
`frame-ancestors 'none'`), HSTS (`max-age=31536000; includeSubDomains`, no preload), `X-Frame-Options: DENY`, `nosniff`
and `strict-origin-when-cross-origin`. `/admin/` has its own looser CSP (Sveltia from jsDelivr and unpkg, GitHub's API).
- Next's static export writes inline `<script>`s; `scripts/postbuild.mjs` moves them into content-addressed files in
  `/_next/static/inline/` and fails the build on anything the CSP would block (inline script, style attribute or
  `<style>`, `on*` handler, `javascript:` URL). Use a class, never `style={…}`, in server-rendered markup. Shiki's
  token colors are classes (`.shk-*` in `blog/blog.css`).
- `/should/` is Product Manager's Should page (repo rodmjay/should), copied byte-identical by `scripts/should.mjs` after
  postbuild (CI checks out rodmjay/should's main; locally set `SHOULD_SRC`). It has inline scripts, so it gets its own
  CSP: `script-src 'self'` plus a sha256 hash of each inline script, computed at build; `style-src 'self'` with
  `style-src-attr 'none'`. A `<style>` block, a style attribute, an `on*` handler, a `javascript:` URL or a script from
  another origin fails the build, naming Product Manager (the owner) to fix it in rodmjay/should. Exception: the demo's
  compiled Svelte bundle still writes style attributes at run time, so `/should/demo/*` keeps `style-src 'self'
  'unsafe-inline'` until Product Manager rebuilds it (the build log says when it can go). `/should/demo/*`
  paths that aren't real files get the demo's SPA shell; the Pages-only root `404.html` isn't copied.
  `e2e/should.spec.ts` checks it; postbuild's guards skip `out/should/`.
- `tests/serve.mjs` sends the same headers, and `e2e/csp.spec.ts` fails on any CSP violation. `BASE_URL=<host> npm run
  test:e2e` runs the whole suite against a deployed site (the one test that would send a real request is skipped).

## Deploy

`.github/workflows/azure-swa.yml`: on push to `next` it builds, runs the tests, logs in to Azure with OIDC, fetches the
app's deployment token at run time (masked) and deploys `out/`. Repo variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID`, `AZURE_SWA_NAME`, `AZURE_SWA_RESOURCE_GROUP`. The old Pages build (`blog.yml`) is gone.
