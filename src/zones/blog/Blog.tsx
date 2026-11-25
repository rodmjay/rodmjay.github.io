// The blog pages: the index, tag pages and their pages, and a post. Same markup as scripts/build-blog.mjs wrote on
// Pages (Designer's spec, design/specs/rodmjay-blog.md); the post body is the markdown rendered at build time.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, HTML_LANG } from "@/lib/site.mjs";
import { loadBlog, pt, postDate, BASE } from "@/lib/blog.mjs";
import { meta } from "@/lib/meta";
import { CodeCopy } from "./CodeCopy";

type Lang = "en" | "es";
/* eslint-disable @typescript-eslint/no-explicit-any */
type Post = any;

const Time = ({ p }: { p: Post }) => <time dateTime={p.date}>{postDate(p.date, p.lang)}</time>;
const Html = ({ html }: { html: string }) => <div className="contents" dangerouslySetInnerHTML={{ __html: html }} />;

async function findList(path: string) {
  const b = await loadBlog();
  const l = b.lists.find((x: any) => x.path === path);
  if (!l) notFound();
  return { b, l };
}

export async function listMeta(path: string) {
  const { b, l } = await findList(path);
  const B = dict(l.lang).blog;
  const heading = l.tagKey ? pt("tagged", l.lang, { tag: b.tagInfo(l.tagKey).name[l.lang] }) : B.tagline;
  const title0 = l.tagKey ? heading : B.title;
  const title = l.n > 1 ? `${title0} · ${pt("page", l.lang, { n: l.n, total: l.total })}` : title0;
  return meta({ lang: l.lang, title, description: l.tagKey ? heading : B.description, path: l.path, alt: l.otherPath, noindex: b.SAMPLE || !l.items.length, rss: true });
}

export async function BlogList({ path }: { path: string }) {
  const { b, l } = await findList(path);
  const lang: Lang = l.lang, B = dict(lang).blog;
  const heading = l.tagKey ? pt("tagged", lang, { tag: b.tagInfo(l.tagKey).name[lang] }) : B.tagline;
  const used: string[] = b.usedTags(lang, b.listed[lang]);
  const pageUrl = (n: number) => (n === 1 ? l.base : `${l.base}page/${n}/`);
  return (
    <>
      <header className="page-head col"><h1 className="ds-headline-large" id="blog-title">{B.title}</h1><p className="ds-title-medium">{heading}</p></header>
      <main id="main" className="col ix blog">
        {b.SAMPLE && l.items.length > 0 && <p className="ds-banner sample">{B.sample}</p>}
        {used.length > 0 && (
          <ul className="filters" aria-label={B.tags}>
            <li><Link className="ds-chip" href={BASE[lang]} aria-current={l.tagKey ? undefined : "page"}>{B.all}</Link></li>
            {used.map((k) => <li key={k}><Link className="ds-chip" href={b.tagUrl(k, lang)} aria-current={k === l.tagKey ? "page" : undefined}>{b.tagInfo(k).name[lang]}</Link></li>)}
          </ul>
        )}
        {l.items.length ? (
          <ul className="ds-post-list">
            {l.items.map((p: Post) => (
              <li key={p.url}>
                <Time p={p} />
                <h2><Link href={p.url}>{p.title}</Link></h2>
                <p>{p.dek}</p>
                <div className="ds-post-tags">{p.tags.map((k: string) => <Link key={k} className="ds-chip" href={b.tagUrl(k, lang)}>{b.tagInfo(k).name[lang]}</Link>)}</div>
              </li>
            ))}
          </ul>
        ) : <p className="ds-body-large ds-variant">{pt("empty", lang)}</p>}
        {l.total > 1 && (
          <nav className="more" aria-label={B.pages}>
            {l.n > 1 ? <Link className="ds-btn text" href={pageUrl(l.n - 1)}>← {pt("newer", lang)}</Link> : null}
            <span className="ds-body-medium ds-variant">{pt("page", lang, { n: l.n, total: l.total })}</span>
            {l.n < l.total ? <Link className="ds-btn text" href={pageUrl(l.n + 1)}>{pt("older", lang)} →</Link> : null}
          </nav>
        )}
      </main>
    </>
  );
}

async function findPost(lang: Lang, slug: string) {
  const b = await loadBlog();
  const p = b.built[lang].find((x: Post) => x.slug === slug);
  if (!p) notFound();
  return { b, p };
}

export async function postMeta(lang: Lang, slug: string) {
  const { p } = await findPost(lang, slug);
  const other: Lang = lang === "en" ? "es" : "en";
  return meta({ lang, title: p.title, description: p.dek, path: p.url, alt: p.twinUrl === BASE[other] ? null : p.twinUrl, noindex: !p.live,
    type: "article", image: p.cover || undefined, imageAlt: p.coverAlt, published: p.date, rss: true });
}

export async function PostPage({ lang, slug }: { lang: Lang; slug: string }) {
  const { b, p } = await findPost(lang, slug);
  const other: Lang = lang === "en" ? "es" : "en";
  const h2s = p.env.headings.filter((h: any) => h.level === 2);
  const toc = h2s.length >= 4 && p.toc !== false; // 4+ h2s only (Designer 11/21); front matter can only turn it off
  return (
    <>
      <main id="main" className="col post blog">
        <article>
          <header className="ds-post-head">
            <p className="ds-post-kicker">{p.tags.map((k: string) => <Link key={k} href={b.tagUrl(k, lang)}>{b.tagInfo(k).name[lang]}</Link>)}</p>
            <h1 className="ds-post-title">{p.title}</h1>
            <p className="ds-post-dek">{p.dek}</p>
            {/* The other language is a different root layout, so this one is a plain link (a full load), like the menu. */}
            <p className="ds-post-meta"><Time p={p} /><span>{p.reading}</span><a className="ds-post-lang" href={p.twinUrl} lang={HTML_LANG[other]}>{pt("other_lang", lang)}</a></p>
          </header>
          {p.cover && <figure className="ds-post-cover"><img src={p.cover} alt={p.coverAlt} {...(p.coverDims || {})} fetchPriority="high" /></figure>}
          {toc && <details className="ds-toc"><summary>{pt("toc", lang)}</summary><ol>{h2s.map((h: any) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol></details>}
          <div className="ds-prose" dangerouslySetInnerHTML={{ __html: p.html }} />
          <footer className="post-foot">
            <div className="ds-post-tags">{p.tags.map((k: string) => <Link key={k} className="ds-chip" href={b.tagUrl(k, lang)}>{b.tagInfo(k).name[lang]}</Link>)}</div>
            {(p.prev || p.next) && (
              <nav className="ds-pager" aria-label={dict(lang).blog.posts}>
                {p.prev && <Link className="prev" href={p.prev.url}><small>← {pt("prev", lang)}</small>{p.prev.title}</Link>}
                {p.next && <Link className="next" href={p.next.url}><small>{pt("next", lang)} →</small>{p.next.title}</Link>}
              </nav>
            )}
          </footer>
        </article>
      </main>
      <CodeCopy lang={lang} />
    </>
  );
}
