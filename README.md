# rodmjay.com

Rod Johnson's personal site, served by GitHub Pages at rodmjay.com.

- Copy lives in `i18n/en.json` and `i18n/es.json` (neutral Latin American Spanish, our own translation). Both must have the same keys.
- `src/page.html` is the one template. `node scripts/build.mjs` writes `index.html`, `es/index.html` and `404.html`, and fails on a missing key or placeholder. Commit the built pages.
- `ds/` is a stripped public copy of the design system (rod brand). Refresh it with `DS_COPY=<design system copy script> scripts/sync-design-system.sh`.
- `CNAME` points Pages at rodmjay.com.

## Blog (markdown, $0)

- Posts live in `_content/posts/en/<slug>.md` and `_content/posts/es/<slug>.md`, tied by the same `id` in the front matter (title, dek ≤180 characters, date, tags, cover and cover_alt, toc, draft). Tags and their EN/ES names: `_content/tags.yml`. Images: `blog/media/`. The `_` keeps the markdown off the live site.
- `npm ci && node scripts/build-blog.mjs` writes `blog/`, `es/blog/` (index, pages, tag pages, posts), `blog/feed.xml`, `es/blog/feed.xml` and `sitemap.xml`, per Designer's spec (design/specs/rodmjay-blog.md). Shiki highlights code at build time; the only blog JS is `blog/blog.js` (language menu, Copy).
- It fails on: a live post without its twin, an image or `<svg role="img">` without alt text, an unknown tag, a dek over 180 characters, or Spanish in the "tú" form (the site uses usted).
- A post goes live only when both languages say `draft: false`. Drafts build as noindex pages, stay out of the feeds and sitemap, and the index lists them as samples only while nothing is live. `--no-drafts` (or `BLOG_DRAFTS=0`) leaves them out.
- The **Build the blog** Action (`.github/workflows/blog.yml`) runs on every push to main that touches the blog, and commits the built pages to main, which Pages serves (branch main, /).
- Editor: **https://rodmjay.com/admin/** (Sveltia CMS, pinned with SRI). Sign in with "Sign In Using Access Token": a GitHub fine-grained token for this repository only, Contents read and write. It commits markdown to main, and the Action builds it.
