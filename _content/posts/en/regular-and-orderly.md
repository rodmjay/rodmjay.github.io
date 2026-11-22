---
id: regular-and-orderly
title: Regular and orderly
dek: Why the most boring parts of my week are the reason the interesting work happens, and what that has to do with architecture.
date: 2026-11-21
tags: [habits, architecture, focus]
toc: true
draft: true
---
This is a sample post while the blog is being built. The real post is on its way. Until then, this page shows how a post looks, with every kind of content a post can have.

## Text and lists {#text}

A paragraph reads like this one, with [a link](/blog/), some **bold words** and a bit of `inline code`.

- A list item.
- Another list item.
- A third one.

> “Be regular and orderly in your life, so that you may be violent and original in your work.”
>
> — Gustave Flaubert

## Code {#code}

A code block has a label and a Copy button:

```yaml title="_content/posts/en/regular-and-orderly.md" {3}
# _content/posts/en/regular-and-orderly.md: the Spanish twin shares its id
---
id: regular-and-orderly
title: Regular and orderly
date: 2026-11-21
tags: [habits, architecture, focus]
draft: true
---
```

A short one without a label:

```sh bare
node scripts/build-blog.mjs   # fails if a live post has no twin
git push                      # GitHub Pages publishes it
```

::: pullquote
A pull quote looks like this, set large between two lines.
:::

## Figures and tables {#figures}

<figure class="wide"><svg viewBox="0 0 832 200" role="img" aria-label="Draft, then both languages written, then published" style="display:block;width:100%;height:auto"><g font-family="var(--md-ref-typeface-plain)" font-size="18" text-anchor="middle"><rect x="16" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-outline)" stroke-width="2"/><text x="116" y="106" fill="var(--md-sys-color-on-surface)">Draft</text><rect x="316" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-tertiary)" stroke-width="2"/><text x="416" y="106" fill="var(--md-sys-color-on-surface)">EN + ES written</text><rect x="616" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2"/><text x="716" y="106" fill="var(--md-sys-color-on-surface)">Published</text><path d="M224 100h84M524 100h84" stroke="var(--md-sys-color-on-surface-variant)" stroke-width="2"/><path d="M300 92l8 8-8 8M600 92l8 8-8 8" fill="none" stroke="var(--md-sys-color-on-surface-variant)" stroke-width="2"/></g></svg><figcaption>A sample diagram.</figcaption></figure>

| Column | Column | Column |
| --- | --- | --- |
| Sample | Yes | Both languages |
| Sample | Yes | Both languages |
| Sample | No | No |

---

A sentence with a footnote.[^1]

[^1]: A sample footnote.
