# 0001. The blog: markdown on GitHub Pages with a git-based editor, $0 a month

Date: 2026-11-21. Status: **accepted** (Software Architect). Deciders: Rod (11/21 via EA: "i want to host a blog on
rodmjay.com", "lets just keep it free for now", "no payload"), Software Architect. Look: Designer
(~/dev/personal/design/specs/rodmjay-blog.md). Posts: PR Person; nothing publishes without Rod's yes for the exact text.

## Decision

- **Content** is markdown in this repo: each post is an English and a Spanish file tied by an `id`; the build refuses a
  live post without its twin, a figure without alt text, or Spanish that isn't usted.
- **Build** is a small Node script (markdown-it, Shiki with CSS variables at build time, no highlighting JS in the
  browser) run by a GitHub Action on every push to main; it commits the built pages, which Pages serves from main.
  Index and post pages in both languages, hreflang, RSS per language, sitemap, Open Graph; self-hosted fonts.
- **Editor** is Sveltia CMS at /admin/ (pinned by version and SRI): i18n collections, draft by default. Sign-in is a
  GitHub fine-grained token Rod creates for this repo only (Contents read and write); no OAuth proxy, no new account.
- **Cost:** $0 (GitHub Pages and Actions free tier; no server, no database).

## Rejected

- **Payload CMS** (Rod: "no payload"): it needs a server and a database; even free tiers add accounts and limits.
- **A hosted OAuth proxy for "Sign in with GitHub"**: a new account and a moving part for one editor.

## Consequences

- An Action commit with the built-in token may not trigger a Pages build in every case; if an edit doesn't appear, the
  next push deploys it. Switching Pages' source to "GitHub Actions" removes that gap (a settings change, EA's sitting).
- The resume form (Supabase Edge Function resume-request) and the rest of the site are unchanged.
