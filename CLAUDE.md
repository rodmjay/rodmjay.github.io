# Building on rodmjay.com (any session, Rod's own included)

Rod 11/23: "from now on i can vibe code features to the rodmjay.com with supabase data." Rod says "add a page that
shows X"; you ship it. This file is how to do that safely. The layout, build and tests are in [README.md](README.md).

## The flow

1. **Branch from `next`**, build the feature, open a PR into `next`. Merging it deploys **staging**
   (`delightful-beach-01ee13710-staging.centralus.5.azurestaticapps.net`).
2. **Check staging** in a browser at 1280 px and 375 px, EN and ES: it renders, nothing jumps, no console errors.
3. **Promote**: a PR from `next` into `main`; the required `build` check runs; merge deploys **rodmjay.com**.
4. Reversible site changes ship **without asking Rod** (standing yes). Tell him in one line what's live.

## Data: only through Edge Functions over curated views

- The site never holds a database key and never calls Supabase's REST or SQL directly (DECISIONS). Data comes in at
  **build time** (or from an edge-cached function for live data), through a Supabase **Edge Function** that reads a
  curated **`public_*` view**: safe columns only, chosen on purpose.
- **Existing feeds:** `public-recipes` (recipes) and `public-life` (the life feeds registry, `public_feeds`). A new kind
  of data is usually a new feed in `public-life`, not a new function.
- **A new feed or function** needs:
  1. **Database Administrator** for the view and the registry row (every schema change goes through DBA);
  2. **Security Officer's** sign-off under its public-function standard (`security/EDGE-FUNCTION-STANDARD.md` in the
     personal workspace) and its line in the register of `verify_jwt=false` functions;
  3. the view enforces `security/NEVER-SHARE.md`: never Rod's employer, his kids' details, money, home or live
     location, health numbers or contacts;
  4. Compliance if the data comes from another service with display rules (Spotify, Google, and so on).
- **Turning a feed on is publishing, so only Rod does it** (the portal toggle). Build it, leave it off, and send the
  feed to Executive Assistant for Rod's pick. Everything else in this file is yours to do.
- **No cold starts for visitors:** pages are static, built from the function at deploy time; anything live is cached
  at the edge. A page never waits on a function that may be asleep.
- **Production never shows sample data.** In CI an empty or failing feed fails the build; fixtures are for local runs.

## Look and words

- **Design system only** (`public/ds/`, `@should/design-system`): tokens and `ds-` components, no hand-picked colors,
  fonts or one-off components. Anything visual new gets **Designer's** check before it reaches `main`; a missing
  component goes to Designer, never invented here.
- **English and Spanish (es-419, usted)** on every page, our own written translations in `i18n/*.json` (the build
  fails on a missing key). Never machine translation or a browser widget.
- **No jitter:** every in-app link is a Next `<Link>`, the shell stays in the root layout, images have sizes, nothing
  shifts while loading. Click every nav item on staging to check.
- Words follow the personal workspace's `texting/VOICE.md`: plain, short, no AI-slop look or copy. Public pages never
  name Rod's employer ("a major real estate company").
- Family rules: nothing about alcohol, coffee or tea; no names or details of other people.

## Before you push

- `npm run build` and `npm test` pass locally (or the PR's `build` check does).
- New pages are in both languages, linked from somewhere, and covered by `tests/old-urls.mjs` once live.
- Headers: the CSP in `public/staticwebapp.config.json` stays strict (no inline script; a new outside host needs
  Security).
- Analytics, once live (psh ADR 0059): public pages only, never a path with an id, email or token.
