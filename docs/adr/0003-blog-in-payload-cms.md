# 0003. The blog's posts come from Payload CMS, built static

Date: 2026-11-23. Status: **proposed**; built behind a switch, nothing live (Software Architect). Rod, 11/23: "we want
to move the blog to a CMS using payload now" (DECISIONS; replaces the 11/21 "no Payload" rows). The full decision, the
infrastructure and the cost are in psh **ADR 0058** (`docs/decisions/0058-rodmjay-blog-on-payload-cms.md`); this note
covers what changes in this repo. Builds on 0001 and 0002.

## Decision

- **The site stays a static export on Static Web Apps Free.** Payload runs as its own small app (admin and API) on
  Azure Container Apps, scaled to zero. Nobody visiting rodmjay.com ever waits on it: pages are built ahead of time.
- **Build time only.** `scripts/cms-snapshot.mjs` runs before `next build`. With `CMS_SOURCE=payload` it fetches the
  published posts, tags and media from `CMS_API` (anonymous reads; the CMS serves only published work to anyone),
  waits out a cold start with retries, writes `.cms/snapshot.json` and downloads media into `public/blog/media/`.
  Anything off fails the build, so a half-fetched blog never deploys. Without the switch it does nothing.
- **Same rendering.** `src/lib/blog-source.mjs` turns the snapshot into the same front matter and markdown body the
  files give, and `src/lib/blog.mjs` keeps every rule and renders with the same markdown-it and Shiki code. The body
  stays markdown in the CMS (a code editor), so pull quotes, wide figures, footnotes, code titles and heading anchors
  are unchanged. The site's build guards still run, and the CMS checks the same rules before it lets Rod publish.
- **Same URLs.** `/blog/<slug>/`, `/es/blog/<slug>/`, the tag pages, both feeds, the sitemap and hreflang come from
  the same code. The slug is a per-language field in the CMS; the importer copies each file name into it.
- **Publishing deploys.** A published change in the CMS starts this repo's workflow on main (`workflow_dispatch`,
  through a GitHub App or fine-grained token with Actions: write on this repository only). The daily scheduled build
  picks up anything a dispatch missed.
- **Markdown stays the fallback** until cutover: `_content/` is untouched, and unsetting `CMS_SOURCE` goes back to it.
- **Drafts aren't on the site in CMS mode.** The snapshot holds published posts only; drafts are reviewed in the CMS.
- **SITE_BUILD_ID** (optional) pins Next's build id, so two builds of the same content can be compared.

## Proof (11/23, local)

The importer (psh `products/rodmjay-cms/web/scripts/import-markdown.ts`) loaded every post, tag and media file into a
local Payload on Docker Postgres; a second run changed nothing. Built from that CMS:
- `tests/cms-parity.mjs` against the markdown build: every file present on both sides, and all 72 compared files
  identical, feeds and sitemap byte for byte, HTML with script tags removed and head elements sorted (Next orders
  those differently on every build, markdown against markdown included);
- `npm run test:urls`: all 32 old URLs exist;
- Playwright: 89 passed, 1 skipped (desktop and phone, the Should page included).

## Cutover (after psh ADR 0058's apply and sign-offs)

1. Import into the hosted CMS (psh ADR 0058, "One-time steps"), then a staging run on `next` with the two variables.
2. Parity: build `next` from the markdown and from the CMS with the same `SITE_BUILD_ID`; `node tests/cms-parity.mjs`.
3. Set the repo variables `CMS_SOURCE=payload` and `CMS_API` for main.
4. Retire Sveltia: remove `public/admin/` and its CSP route, and revoke its GitHub token. `_content/posts` stays in git
   history; a later PR removes it once the CMS has run a month.

## Rollback

Unset `CMS_SOURCE` (one repo variable) and run the workflow: the site builds from the markdown again. Posts written
only in the CMS would need exporting first; the importer's reverse isn't built.
