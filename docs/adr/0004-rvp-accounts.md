# 0004. Accounts on rodmjay.com: save your RVP result

Date: 2026-11-25. Status: **proposed**. Staging only until the reviews pass (Software Architect). Deciders: Rod, who
asked for this in the EA chat on 11/25 (DECISIONS): "we want to essentially convert rodmjay into a saas, when they
complete they quiz they can choose to create account and store their result, then everybody that has a profile on the
site will have a personality and they get added to my contacts, store all this personality stuff in my supabase".
Software Architect leads. Reviewers:

- Philosopher: the framework and the words.
- Database Administrator: the schema.
- Security Officer.
- Compliance Officer.
- Designer: the screens.

Builds on 0002 (a static site on Azure SWA; Supabase only through Edge Functions), on the RVP test (`src/rvp/`), on
the resume form (migration 0155: visitors as contacts) and on remove-my-info (migration 0202, `erase-request`).

## What a visitor gets

1. After finishing the test, the result page shows one optional card: **"Save my result."** Nothing changes for anyone
   who skips it. The test still runs entirely in the browser, and the answers stay in the address.
2. To save, the visitor enters an email, an optional first name and a language. They confirm their age (a neutral
   screen, 18+) and make the separate, unticked choices described below. We email them a **6-digit code**, which they type into the same tab. The result is saved
   and they are signed in.
3. **My profile** (`/rvp/me/`, `/es/rvp/me/`) shows:
   - their latest result: the full result page, read from the server;
   - every earlier take, with its date and test version;
   - Retake, which saves the new result as a new row;
   - Download my data (JSON);
   - Delete my account;
   - Sign out.
4. Signing in later uses the same email and code. There are no passwords and no Google or Apple sign-in in v1.
5. Profiles are **private**. v1 has no public profile pages, no directory and no comparing people. Adding public
   profiles later is reversible: a new ADR, an opt-in per person, and a Designer and Compliance pass.

## Decisions

### Accounts: Supabase Auth, email code only, accounts created only by our function

- We use **Supabase Auth** on the existing project `rodmjay-personal`, because Rod asked for "my supabase" and confirmed 11/25 ("No, my personal one"). It
  provides sessions, refresh, OTP expiry, rate limits and sign-out everywhere, so we write none of that ourselves.
- **Email OTP (code) only.** We chose a code over a magic link for two reasons:
  - the answers live in the open tab;
  - a link opened in a phone's mail app would land in another browser, without the answers and without the PKCE
    verifier.
- **Public sign-up is off** (Auth setting "Allow new users to sign up" = off). Anonymous sign-ins and every other
  provider are off too. A new auth user is created only by the `rvp-account` Edge Function (`start`), after these
  checks pass:
  - consent;
  - honeypot;
  - fill time;
  - rate limits.

  Everything else is just signing in: `signInWithOtp({ shouldCreateUser: false })`.
- **Mail goes through our own mailer, not Supabase's.** A Supabase **Send Email Hook** calls an Edge Function, which
  sends the code through psh Notifications over ACS. That is the same mailer and pattern remove-my-info uses: an IdP
  client with send scope only, and fixed EN/ES templates `rvp-code`. Supabase's built-in mailer is never used.
- **What the browser holds:**
  - The Supabase publishable (anon) key, used only by the auth client. It can't read a table: RLS stays on with no
    policies, and `anon` and `authenticated` keep **no grants**. This is the one new thing the browser holds; Security
    to pass it.
  - The Supabase session, in `localStorage` (supabase-js default). Sign-out clears it.
- **CSP:** `connect-src` adds `https://ibrovaaqbddkhqsmadqk.supabase.co/auth/v1/` next to the existing `/functions/v1/`
  path. No other origins.
- A sign-up that never enters its code is deleted after 24 hours, together with its auth user: we keep nothing from it.

### Data: in Rod's Supabase, through one Edge Function and security-definer functions

- **One Edge Function, `rvp-account`:**
  - CORS rodmjay.com only, 8 KB cap.
  - `start` is public: honeypot, fill time and rate limits, like `resume-request`.
  - Every other action needs a verified Supabase JWT, and the function takes the user id from the JWT, never from the
    body.
  - Actions:
    - `start {email, name?, lang, consent_version, hp, t}`
    - `save {fragment}` (`v=<bank>&a=<27 digits>`)
    - `me`
    - `export`
    - `delete`
- **Tables, for DBA** (names are proposals; they sit in schema `rvp`, see Isolation). Each table has RLS on, no grants,
  and only `security definer` functions write to it:
  - `rvp_banks`: one row per test version. It holds the version, the bank JSON, its sha256 and the release date, so an
    old answer string can always be scored by the bank it was given under. `0.1-draft` is the current version, and
    results saved under it are marked draft.
  - `rvp_profiles`: one row per account. It holds:
    - `auth_user_id`, unique;
    - `contact_id`;
    - lang;
    - `consent_version`, `consented_at` and `ip_hash`;
    - created, last sign-in and status.
  - `rvp_results`: **append only.** One row per saved take:
    - `profile_id`;
    - `bank_version`;
    - `answers` (27 digits);
    - `engine_version`;
    - the derived `code` (3 facets), the secondary, and the scores per dimension (jsonb, for querying only);
    - `taken_at`.

    The answers plus the bank version are the truth. The derived columns can be recomputed, but no row is ever edited.
  - View `contact_personality`: built only for people who tick choice (d) (see Who sees a result).
- **Write path:** `rvp_account_start(...)` and `rvp_result_save(auth_user_id, bank_version, answers, derived)`.
  - The function checks that the bank version exists and that the answers decode under it.
  - The derived fields come from the same engine (`src/rvp/engine.ts`, run in the Edge Function, Deno).
  - The database re-checks shape and lengths.
- **Contacts, only with their own consent (choice b below):** the first saved result finds or creates the contact by
  verified email, the same way the resume form does. Without that choice, the account and its results exist, but no
  contact row does.
  - Tags: `source/rodmjay.com` and a new `source/rvp`.
  - No group, no privileges, `text_tier = 'never'`. The texting gate, Investigator and the gift routine skip the
    `source/rvp` tag (see Isolation). They are never mixed with family or friends.
  - An existing contact who already has a group keeps it. Their RVP data links to them, and the account grants them
    nothing new.
  - Only verified emails ever become contacts, because the contact is created at `save`, after the code, never at
    `start`.

### Consent, export and delete, from day one

- **Three separate choices, all unticked** (Compliance, 11/25). Each one stores its source, date and wording version.
  - **(a) Save my result to an account.** This is required to save, and it covers nothing else.
  - **(b) Add me to Rod Johnson's contacts.** It's its own purpose and is not needed for (a). The wording says Rod can
    see individual results.
  - **(c) Email (or texts) about new things.** This is off in v1. The choice ships only when a sender exists, and texts
    also need a phone number plus the texting gate's consent source and date.
- **The page's "nothing is sent to a server" line** is rewritten in EN and ES in the same PR that adds saving. Taking
  the test without saving stays entirely local.
- **What we never do** with results:
  - infer health, religion or orientation;
  - sell or share them;
  - use them for ad targeting or for employers.

  The not-clinical line stays on every result.
- **Age:** a neutral age screen; 18+ only. An account found to be a minor's is deleted on discovery.
- **Law:** the site is open to anyone, so the policy is written to the GDPR and UK GDPR standard, naming the
  controller and the transfer basis (Supabase, US). We honor Global Privacy Control. Security keeps a breach-notice
  plan covering all 50 states.
- **Privacy policy and terms:** updated in EN and ES, in our own written translation, before launch.
- **Privacy page:** a new section in EN and ES saying:
  - what we keep: email, first name, answers, results, dates, the hashed IP at sign-up;
  - why;
  - where it lives;
  - how long: until deleted, or 24 months after the last sign-in, with a reminder email first (proposal for
    Compliance);
  - how to delete it.
- **Export:** `export` returns everything held for the account as JSON: profile, every result with its bank version,
  the consent record and the contact fields. It needs no human step.
- **Self-serve delete:** `delete` (signed in, confirmed with a typed "DELETE" or "BORRAR") runs the remove-my-info
  erasure for that verified email, extended to the RVP tables and the auth user. It writes the same proof record and
  sends the same "done" mail.
  - The remove-my-info **guard rail** stays: a contact in a family or friend group, or with gifts, dates or an entity
    role, loses only the account and the RVP data at once. Everything else goes to Rod's manual route.
  - The public `/remove/` form covers people who lost access to their email; it now also deletes RVP data.
- A restore from backup replays the erasure log before going live (already in the backup runbook).
- After an erasure, audit_log keeps no personal data (0202 already scrubs it). The hard delete runs under Rod's 11/24
  standing yes for verified requests (DECISIONS). The backups use the /remove/ page's 30-day wording.

### Isolation inside rodmjay-personal (Rod 11/25: "No, my personal one"; Security and DBA design it)

Rod chose his personal project over a separate one, after seeing Compliance's reason for separating them (DECISIONS
11/25). The goal stays the same: a compromise of the public signup path must not reach the rest of his data.

- **Own schema:** every RVP table lives in schema `rvp`. RLS is on with no policies, and `anon`, `authenticated` and
  `PUBLIC` get no grants on the schema.
- **No service-role key in the visitor path:**
  - `rvp-account` connects as a dedicated login role, `rvp_api`. That role may only EXECUTE the `rvp.*` definer
    functions, and has no USAGE on `public` or any other schema.
  - Each definer function is owned by a role, `rvp_owner`, that holds rights on the `rvp` schema and on nothing else.
- **The two narrow crossings,** each its own function owned by a role that holds only that right:
  - `rvp.contact_link`: creates or finds a contact by email, tags it and returns its id. It reads nothing else.
  - `rvp-auth-admin`: a small separate Edge Function that holds the service-role key and does exactly two things,
    create user and delete user. Only `rvp-account` calls it, with a shared secret.
- **Probe:** a test that signs in as `rvp_api` and tries to read `public.contacts`, `text_log` and `bills` must fail.
- **Contacts:** tagged `source/rodmjay.com` and `source/rvp`, with **no group and no privileges** and
  `text_tier = 'never'` (EA 11/25).
  - Compliance asked for a zero-privilege group to keep these contacts out of texting, Investigator enrichment and
    gifts. Instead, the texting gate, Investigator and the gift routine skip anyone with the `source/rvp` tag, and the
    probe tests that. Compliance to confirm that's enough.

### Who sees a result (Philosopher 11/25; Rod's yes needed on the default)

- **A saved result belongs to the person.**
  - Rod, Life Coach and every agent see no individual archetype.
  - The archetype is not part of the contact record.
  - No agent infers or stores an archetype for anyone.
- **By default, Rod sees aggregates only:** counts per archetype, with no names.
- **The `contact_personality` view is not built** unless the person ticks a separate choice:
  - **(d) Let Rod see my result with my contact.** Plain words about who sees it. Off by default.
- This narrows Rod's "everybody … will have a personality", so EA brings him the default as one question.
- **Profile framing:** "Your result from <date>: how you lean right now, in your own answers. A map, not a verdict. It
  can change."
  - The latest result is shown first, with a quiet list of earlier results (date, archetype, bank version).
  - No trend graph, no score of how much someone changed, no nagging to retake.
  - Never use: "you are a …", "your type", "people like you", "best fit", rankings, clinical words, "accurate", or
    hiring, health or relationship advice.
  - Delete-my-results carries the same weight on the page as save.
  - The Spanish uses usted, in our own written translation.
- **Bank 1.0 before accounts go live.**
  - Rod's question edits come first.
  - Then 1.0 is frozen, and the 0.1-draft rows are purged.
  - A retake under a different bank says "different questions then."

### Not in v1

- Payments and plans. "SaaS" here means accounts, not billing. If a paid tier ever comes, it uses the @psh/kit billing
  pieces under a new ADR.
- Public profiles, sharing a profile and comparing people. The shareable link (`#v=…&a=…`) and the card download stay
  as they are, and they hold no identity.
- Texting or emailing account holders anything but the code, the erasure mails and the 24-month reminder. Newsletters
  or follow-ups need their own consent and a Compliance pass.

## Why not the alternatives

- **Our own magic-link tokens** (the pattern remove-my-info uses): we'd write sessions, refresh, expiry and sign-out
  ourselves. That's more code and more attack surface, for nothing Supabase Auth doesn't already do.
- **A separate Supabase project, or psh's IdP (Keycloak):** cleaner isolation, and Compliance recommended it. Rod
  decided against it on 11/25 ("No, my personal one"), so isolation is done inside the project instead (see
  Isolation).
- **Saving without an account** (a key in the link): it can't make the visitor a contact or let them delete reliably,
  and losing the link loses the result.

## Rollout gates

1. This ADR and the plan go to Philosopher, DBA, Security, Compliance and Designer.
2. Staging build, behind `RVP_ACCOUNTS_ON` (the same pageExtensions gating as `RVP_ON`). DBA's migration is applied
   with the functions inert, and Auth signup stays off.
3. Passes:
   - Security: the threat model, the probe checklist and the anon key in the browser;
   - Compliance: the consent text, the privacy text and retention;
   - Designer: the design check, EN and ES, 375 and 1280, light and dark;
   - Philosopher: the wording on profile pages.
4. EA brings Rod one **"Publishes:"** yes. Production is flipped on only after that. Until then, no real visitor's
   data is collected.

## Consequences

- Rod's personal Supabase gains public, self-registered users. That is the main risk, and the design keeps it narrow:
  - no grants;
  - every write through definer functions;
  - no group;
  - `text_tier = never`;
  - verified email only;
  - self-serve export and delete.
- The RVP result page gets one optional card and the site gets two pages (`/rvp/me/` and its ES twin). The test itself
  is unchanged.
- The `0.1-draft` results saved on staging are test data, and they're purged before launch.
