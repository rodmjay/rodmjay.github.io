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

## Cutover checklist (exact order)

**ROD** marks Rod's steps: the GoDaddy records and GitHub settings. Everything else is agents. Hosts: production
`delightful-beach-01ee13710.5.azurestaticapps.net` (the app's default host), staging
`delightful-beach-01ee13710-staging.centralus.5.azurestaticapps.net`. DNS today (checked 11/23, GoDaddy
`domaincontrol.com`): apex `A` ×4 `185.199.108–111.153`, `AAAA` ×4 `2606:50c0:8000–8003::153`, `www` `CNAME`
`rodmjay.github.io.`, `CAA 0 issue "letsencrypt.org"`, `TXT "v=spf1 -all"`.

**Ready before day one**
1. Staging green: the deploy run passed, `BASE_URL=<staging> npm run test:e2e` passes (a11y, nav, CSP), and the headers
   are on `/`, a post, `/recipes/` and `/admin/` (`curl -sI`). Designer's staging check (1280 and 375, light and dark,
   EN and ES). Compliance approves the privacy hosting text (`privacy.azure` in `i18n/*.json`).

**Branches (Software Architect)**
2. Cut `pages-legacy` from today's `main` and push it: `git push origin origin/main:refs/heads/pages-legacy`. It holds
   the built Pages site and its `CNAME`, for rollback.
3. **ROD (settings):** Settings → Pages → Source: branch `pages-legacy`, folder `/`. rodmjay.com keeps serving the same
   pages, now from that branch, so step 4 can't expose source files on Pages.
4. On `next`: delete `.github/workflows/blog.yml`; in `azure-swa.yml` change `branches: [next]` to `[main]`; set
   `PRIVACY_HOSTING: azure` and `PRIVACY_UPDATED: <the DNS day, YYYY-MM-DD>`. Then merge `next` into `main` (merge commit,
   no squash, so the editor's history stays). The run on `main` deploys to production (the default host only;
   rodmjay.com still points at Pages). Check the production host like step 1.
5. **ROD (settings):** branch protection on `main`: require a pull request and the `build` check, restrict pushes to
   Rod only, no force pushes, no deletion. (The /admin/ editor signs in with Rod's own token, so it still commits.)

**Custom domains (IT Guy)**
6. psh PR: `rodmjay_custom_domains = ["rodmjay.com", "www.rodmjay.com"]` (rodmjay.tf). Merge, apply, then read the two
   tokens from the `rodmjay_domain_validation` output and the app's `stableInboundIP` (portal → Overview → JSON View,
   or `az staticwebapp show … --query stableInboundIP`). Hand Rod the exact values.

**DNS at GoDaddy (ROD)**, in this order. SWA Free can't use `ALIAS` at the apex and GoDaddy has no `ALIAS`/`ANAME`/
flattening, so the apex is an `A` record to the app's regional stable IP (no global edge for the apex; `www` keeps it).
7. **ROD:** add `CAA` · host `@` · `0 issue "digicert.com"` (Azure's certificates come from DigiCert; today's CAA
   allows only Let's Encrypt, which would block them). Keep the Let's Encrypt row until rollback is no longer needed.
8. **ROD:** add `TXT` · host `_dnsauth` · value `<apex validation token>`, and `TXT` · host `_dnsauth.www` · value
   `<www validation token>`. (Use the host names Azure shows next to each token if they differ; IT Guy confirms with
   `dig TXT _dnsauth.rodmjay.com`.) Wait until both domains show **Validated** in Azure.
9. **ROD:** the switch, in one sitting:
   - apex: delete the four `A` `@` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`, and add one `A` · host `@` · value `<stableInboundIP>`;
   - delete the four `AAAA` `@` records `2606:50c0:8000::153` … `2606:50c0:8003::153` (else IPv6 visitors still reach
     Pages);
   - change `CNAME` · host `www` from `rodmjay.github.io.` to `delightful-beach-01ee13710.5.azurestaticapps.net`.

**Verify (IT Guy, then PR Person)**
10. `dig +short A rodmjay.com` = the stable IP, `dig +short AAAA rodmjay.com` = nothing, `dig +short CNAME
    www.rodmjay.com` = the default host. Azure shows both domains Ready with certificates (can take up to 72 h for the
    apex). `curl -sI https://rodmjay.com/` and `https://www.rodmjay.com/` show the CSP and HSTS headers; certificate
    issuer DigiCert. `BASE_URL=https://rodmjay.com npm run test:e2e` passes; every old URL answers 200 (the
    `test:urls` list, fetched live); the feeds and `sitemap.xml` load; the privacy page shows the Azure line; Search
    Console shows no new errors after a day.

**Retire Pages (Software Architect, after 7 quiet days)**
11. **ROD (settings):** Settings → Pages → remove the custom domain and unpublish the site.
12. Commit on `main`: delete the root `CNAME` file (Pages only). Keep `pages-legacy` 30 days, then delete it.
13. **ROD:** remove `CAA 0 issue "letsencrypt.org"` once rollback is closed (optional; it does no harm).

## Rollback

Any time before step 11: **ROD** at GoDaddy restores the old records (four `A` `@` `185.199.108–111.153`, four `AAAA`
`@` `2606:50c0:8000–8003::153`, `CNAME` `www` → `rodmjay.github.io.`) and removes the `A` `@` `<stableInboundIP>`. Pages
is still serving `pages-legacy` with its `CNAME`, so the old site is back as DNS expires (TTL). The TXT and CAA rows can
stay. After step 11, **ROD (settings)** first re-publishes Pages from `pages-legacy` with custom domain `rodmjay.com`,
then the same DNS. Code rollback without DNS: revert the merge on `main` (a PR), and the next run redeploys. HSTS has
no `preload`, so moving back to Pages (also HTTPS) needs nothing else.
