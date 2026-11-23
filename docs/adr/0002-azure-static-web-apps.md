# 0002. rodmjay.com on Azure Static Web Apps (Free), as a Next.js static export

Date: 2026-11-23. Status: **proposed**; live at cutover (Software Architect). Deciders: Rod (11/23: move the site from
GitHub Pages to Azure at $0, and add Recipes), Software Architect. Site owner: PR Person. Look: Designer
(design/specs/rodmjay-recipes.md and rodmjay-blog.md). Builds on 0001; the infrastructure has its own ADR with the
Terraform.

## Decision

- **Hosting:** Next.js 15 with `output: 'export'` and `trailingSlash: true` on Azure Static Web Apps **Free**: free SSL,
  two custom domains (apex and www), global CDN, $0. No server, no API routes.
- **Micro-frontends:** one app with route groups (home, blog, recipes, and the resume form as its own zone) instead of
  separate zones: one owner, static, $0. The boundaries are the ones zones would use, so a section can split later
  without changing a URL.
- **Repo:** this repo. The port lives on branch `next`; Pages keeps serving `main` until cutover.
- **Deploys:** GitHub Actions log in to Azure with OIDC (a federated credential on a user-assigned identity whose role
  only reads the one app and lists its deployment token). The token is fetched at run time and masked, never stored.
- **Editor:** Sveltia CMS at /admin/, unchanged.
- **Supabase:** read only through purpose-built Edge Functions (`resume-request`, `public-recipes`), never tables, never
  anything personal. The resume form's request is unchanged. Recipes are fetched at build time; a daily or manual run
  picks up changes.
- **Same URLs:** `/`, `/es/`, `/blog/<slug>/`, `/es/blog/<slug>/`, tag pages, `/privacy/`, `/privacy/es/`, the feeds,
  `sitemap.xml`, `robots.txt` and the 404. `npm run test:urls` checks every URL the Pages build served.

## Cutover (Rod's steps are only DNS)

1. IT Guy applies the Terraform and sets this repo's Azure variables; the workflow deploys `next` to the app's own host.
2. Designer's staging check on that host (1280 and 375, light and dark, EN and ES).
3. Cut a `pages-legacy` branch from today's `main` (the built Pages site, for rollback). Then merge `next` into `main`,
   delete `.github/workflows/blog.yml`, and switch the deploy workflow's branch to `main`.
4. Rod at GoDaddy: the custom-domain validation records, then the apex and `www` records.

## Rollback

Point DNS back to GitHub Pages, with Pages serving `pages-legacy` (the last pre-cutover `main`, which holds the built
pages). Changing the Pages branch is a settings step.
