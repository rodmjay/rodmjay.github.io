// The browser side of accounts on rodmjay.com (ADR 0004; ADR 0005 "One sign-in for the whole site"). It talks only to the
// rvp-account Edge Function: the browser holds no Supabase key and never calls /auth/v1. The session lives in this tab's
// sessionStorage, never localStorage (Security MUST 5): closing the tab signs the person out.
// Built only where NEXT_PUBLIC_ACCOUNTS_ON=1 (src/account/gate.tsx); off, nothing here ships.

export const API = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/rvp-account";
const KEY = "acct:session";
/** The fragment (#v=…&a=…) this tab already saved, so a second tap or a reload never saves the same take twice. */
export const SAVED_KEY = "acct:saved";
/** A one-time note for the next page: "out" (signed out on purpose) or "lost" (the session ended elsewhere). */
export const NOTE_KEY = "acct:note";
/** Fired on window whenever this tab signs in or out, so the header link changes without a reload. */
export const SESSION_EVENT = "acct:session";

export type Lang = "en" | "es";
export type Session = { access_token: string; refresh_token: string; expires_at: number };
export type Consent = { source: string | null; at: string | null; wording_sha256: string | null };
export type Take = { id: string; taken_at: string; bank_version: string; is_draft: boolean; code: string; secondary: string | null; answers: string };
/** ADR 0005's part of `me`. {ok:false} while the site mode is off: then there are no site features and no site consent. */
export type Site = { ok: true; linked: boolean; minor?: boolean; consent?: boolean; consent_required?: boolean; parent_consent_required?: boolean; lang?: string }
  | { ok: false; error?: string };
export type Me = {
  ok: true; profile: { email: string; first_name: string | null; lang: string; created_at: string }; consent: Consent;
  /** Whether the recorded consent's wording covers saving results (rvp.consent_wordings.covers_results). */
  consent_covers_results?: boolean; results: Take[]; site?: Site | null;
};
type Reply = { ok?: boolean; error?: string; [k: string]: unknown };

const store = {
  get(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* blocked: this tab only */ } },
};

export function getSession(): Session | null {
  try {
    const s = JSON.parse(store.get(KEY) ?? "null");
    return s && typeof s.access_token === "string" && typeof s.refresh_token === "string" ? s : null;
  } catch { return null; }
}
export function setSession(s: Session | null) {
  store.set(KEY, s ? JSON.stringify(s) : null);
  if (!s) store.set(SAVED_KEY, null);
  try { window.dispatchEvent(new Event(SESSION_EVENT)); } catch { /* no window */ }
}
export const setNote = (n: "out" | "lost" | null) => store.set(NOTE_KEY, n);
export function takeNote(): string | null { const n = store.get(NOTE_KEY); store.set(NOTE_KEY, null); return n; }
export const savedFragment = () => store.get(SAVED_KEY);
export const markSaved = (fragment: string) => store.set(SAVED_KEY, fragment);

/** One POST to the function. Network trouble comes back as {ok:false, error:"network"}, never a throw. */
async function post(body: object, token?: string): Promise<{ status: number; json: Reply }> {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    let json: Reply = {};
    try { json = await r.json(); } catch { /* empty or not JSON */ }
    return { status: r.status, json };
  } catch {
    return { status: 0, json: { ok: false, error: "network" } };
  }
}

/** start and login always answer the same {ok:true}; `t` is the time since the form was drawn (under 3 s is dropped). */
export const requestCode = (action: "start" | "login", lang: Lang, email: string, hp: string, t: number) =>
  post({ action, lang, email, hp, t }).then((r) => r.json);

/** The 8-digit code. On success the session is kept for this tab. */
export async function verify(lang: Lang, email: string, code: string): Promise<"ok" | "code" | "network"> {
  const { status, json } = await post({ action: "verify", lang, email, code });
  const s = json.session as Session | undefined;
  if (json.ok && s?.access_token) { setSession(s); return "ok"; }
  return status === 0 || status >= 500 ? "network" : "code";
}

let refreshing: Promise<boolean> | null = null;
export async function refresh(): Promise<boolean> {
  const s = getSession();
  if (!s) return false;
  refreshing ||= post({ action: "refresh", refresh_token: s.refresh_token }).then(({ json }) => {
    const n = json.session as Session | undefined;
    if (json.ok && n?.access_token) { setSession(n); return true; }
    return false;
  }).finally(() => { refreshing = null; });
  return refreshing;
}

/** A signed-in action. A 401 gets one refresh and one retry; after that the person is signed out ({error:"signin"}). */
export async function call(action: string, lang: Lang, body: object = {}): Promise<Reply> {
  let s = getSession();
  if (!s) return { ok: false, error: "signin" };
  if (s.expires_at && s.expires_at * 1000 - Date.now() < 30_000 && (await refresh())) s = getSession()!;
  let r = await post({ action, lang, ...body }, s.access_token);
  if (r.status === 401 && (await refresh())) r = await post({ action, lang, ...body }, getSession()!.access_token);
  if (r.status === 401) { setSession(null); return { ok: false, error: "signin" }; }
  return r.json;
}

export const me = (lang: Lang) => call("me", lang) as Promise<Me | Reply>;
export const isMe = (r: unknown): r is Me => !!r && (r as Me).ok === true && !!(r as Me).profile;

/** Whether the consent on record covers saving results (Compliance 11/26: never save without it). The one place this is
 *  decided: `me` says so itself (consent_covers_results); anything else counts as no. */
export const consentCoversResults = (m: Me | null | undefined): boolean => m?.consent_covers_results === true;

/** Which "Before you start" box the site needs after the code (ADR 0005), or none: the linked box for an email Rod linked
 *  whose consent isn't recorded, the sign-in box for someone with no match who hasn't accepted it. Site mode off: none. */
export function siteConsentNeeded(m: Me | null | undefined): "linked" | "lead" | null {
  const s = m?.site;
  if (!s || !s.ok) return null;
  if (s.linked) return s.consent_required ? "linked" : null;
  return s.consent === false ? "lead" : null;
}
/** Record that box. `source` says where it was shown; the function hashes its own copy of the words for the kind. */
export const recordSiteConsent = (lang: Lang, kind: "linked" | "lead", source: "rodmjay.com/signin" | "rodmjay.com/rvp/result", firstName = "") =>
  call("site_consent", lang, { kind, accept: true, source, ...(kind === "lead" && firstName ? { first_name: firstName } : {}) });
/** "No thanks, sign me out": the function deletes the account just made and ends the session. */
export async function decline(lang: Lang) {
  await call("decline", lang).catch(() => null);
  setSession(null);
}

/** Record ADR 0004's box (18+, the account, Rod sees the result). Needed once before save works. */
export const recordConsent = (lang: Lang, firstName: string) =>
  call("consent", lang, { consent: true, age: true, ...(firstName ? { first_name: firstName } : {}) });

/** Save one result (the fragment v=<bank>&a=<answers>) as a new take on the signed-in account. */
export async function saveResult(lang: Lang, fragment: string): Promise<Reply> {
  const r = await call("save", lang, { fragment: fragment.replace(/^#/, "") });
  if (r.ok) markSaved(fragment.replace(/^#/, ""));
  return r;
}

export async function signOut(lang: Lang, everywhere = false) {
  await call("signout", lang, { everywhere }).catch(() => null);
  setSession(null);
}

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** The session as kit modules use it (should-core ADR 0001): a token getter, one refresh, sign-out. */
export const kitAuth = {
  token: () => getSession()?.access_token ?? null,
  refresh,
  signedOut: () => setSession(null),
};
