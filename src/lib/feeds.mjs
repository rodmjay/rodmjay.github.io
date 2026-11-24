// Supabase data for the site, read once per build (never in the browser) from the one public read path: the public-life
// Edge Function, GET ?feed=<key> (personal architecture/decisions/0004). It serves only feeds Security passed and
// Database Administrator turned on, each a curated public_* view; no key or secret is involved.
// getFeed(key) → items[]. A feed that's off or unknown (404), or LIFE_API unset (local builds), gives [] and the page
// hides that section. Anything else (network error, 5xx, a wrong shape) fails the build. { required: true } also fails
// a CI build on an empty feed, for pages that must have data.
// New site data need: ask Database Administrator for the view, then call getFeed("<key>") from the page's lib.
const API = process.env.LIFE_API || "";
const memo = new Map();

export function getFeed(key, { required = false } = {}) {
  if (!/^[a-z0-9_-]{1,40}$/.test(key)) throw new Error(`feeds: bad key ${JSON.stringify(key)}`);
  if (!memo.has(key)) memo.set(key, load(key));
  return memo.get(key).then((items) => {
    if (required && process.env.CI && !items.length) throw new Error(`feeds: ${key} is required but empty or off`);
    return items;
  });
}

async function load(key) {
  if (!API) return [];
  const url = `${API}?feed=${key}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`feeds: ${url} answered ${res.status}`);
  const body = await res.json();
  if (!body || body.feed !== key || !Array.isArray(body.items)) throw new Error(`feeds: ${key} didn't return {feed, items: []}`);
  return body.items;
}
