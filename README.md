# rodmjay.com

Rod Johnson's personal site, served by GitHub Pages at rodmjay.com.

- Copy lives in `i18n/en.json` and `i18n/es.json` (neutral Latin American Spanish, our own translation). Both must have the same keys.
- `src/page.html` is the one template. `node scripts/build.mjs` writes `index.html`, `es/index.html` and `404.html`, and fails on a missing key or placeholder. Commit the built pages.
- `ds/` is a stripped public copy of the design system (one brand). Refresh it with `DS_COPY=<design system copy script> scripts/sync-design-system.sh`.
- `CNAME` points Pages at rodmjay.com.
