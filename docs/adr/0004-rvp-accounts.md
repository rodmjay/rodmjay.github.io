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

  Signing in later goes through the same function (Security 11/25, below). The browser never calls `/auth/v1`.
- **Mail goes through our own mailer, not Supabase's.** A Supabase **Send Email Hook** calls an Edge Function, which
  sends the code through psh Notifications over ACS. That is the same mailer and pattern remove-my-info uses: an IdP
  client with send scope only, and fixed EN/ES templates `rvp-code`. Supabase's built-in mailer is never used.
  - The hook checks its signature and fails closed. It never logs the code.
  - It refuses email-change and recovery mails, so `/auth/v1/user` can't be used to change an email.
- **All auth runs on the server; the browser holds no Supabase key** (Security MUST 1–3, 11/25).
  - `rvp-account` calls GoTrue server-side for every step:
    - `start`, which creates the user and sends a code;
    - `login`, which sends a code;
    - `verify`, which checks the code;
    - `refresh`;
    - `signout`.
  - The browser talks only to `/functions/v1/`, so the CSP doesn't change and the anon key never ships.
  - `start` and `login` always answer `200` with the same body, whether the email is new, existing, pending or one of
    Rod's contacts. The mail is queued afterwards, so the response time doesn't reveal the case.
  - Codes:
    - 6 digits, valid 10 minutes (`mailer_otp_exp = 600`), single use;
    - a new code cancels the old one;
    - 5 wrong tries per user, counted in SQL, kill the code.
- **The session** (Security MUST 5–6):
  - Access tokens last 15 minutes or less, with refresh rotation and reuse detection.
  - The session is held in `sessionStorage`, never `localStorage`.
  - RVP pages keep `script-src 'self'` and use no `innerHTML`.
  - `export` and `delete` need a fresh code (5 minutes or less).
  - `delete` signs out every session.
- **JWT checks in the function** (MUST 4):
  - signature, expiry, `aud`/`role` = `authenticated`;
  - the user id comes from `sub` only, never from `user_metadata` or the email;
  - the anon JWT is refused;
  - the profile is looked up on every call, and anything not active is refused.
- **Caps, in SQL** (MUST 7). Over a cap, the answer is the same neutral reply, and an incident is raised:
  - per email: 3 an hour, 10 a day;
  - per IP hash: 5 an hour;
  - global: 200 new auth users and 500 mails a day;
  - saves: 20 a day;
  - new contacts: 50 a day (a circuit breaker).

  Honeypot and fill time are speed bumps only. An unconfirmed user can do nothing.
- **Whole-project grant sweep** (MUST 1, DBA). Existing Edge Functions use the Data API with the service role, so it
  stays on, with these guards:
  - EXECUTE on every function is revoked from `PUBLIC`, `anon` and `authenticated`;
  - default privileges are set the same way;
  - a nightly check alerts if `anon` or `authenticated` ever hold a grant.
- **Side effects:** new `source/rvp` contacts trigger no ask-rod, Todoist or automation events. The export uses an
  allow-list: it never returns Rod's notes, groups or tags for an existing contact.
- Security's full threat model and its 30 probes are in the EA notes folder
  (`security-rvp-accounts-threat-model-2026-11-25.md`). Security signs the exact head it probed.
- A sign-up that never enters its code is deleted after 24 hours, together with its auth user, by a purge with a
  heartbeat. We keep nothing from it.

### Data: in Rod's Supabase, through one Edge Function and security-definer functions

- **One Edge Function, `rvp-account`:**
  - CORS rodmjay.com only, 8 KB cap.
  - `start`, `login` and `verify` are public: honeypot, fill time and rate limits, like `resume-request`.
  - Every other action needs a verified Supabase JWT, and the function takes the user id from the JWT, never from the
    body.
  - Actions:
    - `start {email, name?, lang, consent_version, hp, t}`, `login {email}`, `verify {email, code}`, `refresh`,
      `signout`
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
  Security also checks `has_*_privilege` across every schema: public, ops, auth, storage, vault, net and cron.
- **A platform fact (Security addendum, 11/25).** Hosted Supabase puts `SUPABASE_SERVICE_ROLE_KEY` and
  `SUPABASE_DB_URL` into every Edge Function's environment. So "no service key in the visitor path" holds for our code,
  not for the process: code execution inside `rvp-account` could still read the key. We keep the function on Supabase
  and add the controls below. Moving it to Azure would add a second platform, cold starts and another pipeline for one
  function. Rod accepted this risk on 11/25 ("nobody will get the key", DECISIONS): no move to Azure, and every
  control below stays.
  - **Controls:**
    - minimal dependencies, pinned and locked;
    - no `eval` and no dynamic import;
    - Security reviews every deploy of `rvp-account` and `rvp-auth-admin`, and records its hash in the register.
  - **JWT checks:** user tokens are checked with `GET /auth/v1/user`, which also honours sign-out and delete, never
    with the shared HS256 secret.
  - **The `rvp_api` role:**
    - NOSUPERUSER and NOBYPASSRLS;
    - connection limit 5;
    - statement and idle timeouts;
    - TLS verify-full;
    - member of no other role.

    The migration creates it with no password. The password (40+ random characters, SCRAM) is set out of band as a
    pre-hashed verifier and stored as an Edge secret through the Settings step. It is rotated yearly, on any
    dependency change and on any incident, and connect errors never print it.
  - **Definer functions:**
    - owned by `rvp_owner`, not postgres, without BYPASSRLS;
    - `search_path = ''`;
    - no dynamic SQL;
    - EXECUTE revoked from `PUBLIC` everywhere.
  - **`rvp-auth-admin`:**
    - POST only, 1 KB;
    - a constant-time check of its own secret, separate from the database password;
    - no other routes, and no keys or user lists in its output;
    - `auth.users` holds RVP users only.
  - **`rvp.contact_link`:**
    - column-level rights, adds tags only;
    - returns only the id, and never says whether the contact already existed.
    - Every trigger and sync its insert fires is checked against the tag-skip:
      - audit_log;
      - automations;
      - search_docs;
      - the Quo, Google and iPhone contact syncs;
      - new-contact prompts.

    `text_tier = 'never'` stays the hard stop.
- **Secrets, stored securely (Rod 11/25: "store it securely").**
  - **Where they live:** the service key, the `rvp_api` password and the `rvp-auth-admin` shared secret live only in
    Supabase's managed Edge Function secrets.
  - **Where they never appear:** the repo, client code, the static build, logs, error output, audit_log, statement
    logs, GitHub variables or secrets, or chat.
  - **Who uses what:** the visitor function `rvp-account` connects as `rvp_api` and never reads
    `SUPABASE_SERVICE_ROLE_KEY`. A lint check in CI fails the build if its source names that variable. Only
    `rvp-auth-admin` uses the service key.
  - **Rotation:**
    1. Generate a new password, 40+ random characters.
    2. Set it on `rvp_api` as a pre-hashed SCRAM verifier, so the clear text never reaches the database logs.
    3. Update the Edge secret through the Settings step.
    4. Redeploy and run the sign-in smoke test.
    5. Confirm the old password fails.
    6. Log the date in the register.

    The shared secret rotates the same way. Rotation happens yearly, on any dependency change and on any suspected
    leak.
  - **Leak check:** Security's staging probe greps for each secret's shape in all of these:
    - the built site, and the function responses and errors;
    - the function logs and Postgres logs;
    - audit_log and pg_stat_statements;
    - the GitHub repo and Actions logs.
- **"No agent sees an individual archetype" is a policy, not a wall:** postgres and the service role can still join
  the tables. The consent and privacy text say so plainly.
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

### Review outcomes so far (11/25)

- **Compliance:** a design-stage PASS at 0d52b01, with these conditions. Compliance re-checks the privacy PR and
  again before go-live.
  - **Consent wording.** One required box for the account plus the contact, with the 18+ line and a privacy link. It
    starts unticked, and the stored version is a hash of the exact text. It names email and first name only.
    - EN: "I'm 18 or older. Save my result to an account on rodmjay.com. Rod Johnson will keep my email and first
      name in his own contacts. He won't sell them, text me or add me to a mailing list. I can download or delete
      everything at any time."
    - Choice (d) is separate and covers the results.
    - Spanish: Compliance's es-419 text, adjusted the same way.
  - **Retention.**
    - The account lasts until 24 months after the last sign-in, with one service-only reminder first.
    - `ip_hash` is purged after 30 days.
  - **The tag-skip is enforced fail-closed in code:** `send_compliance.py`, Investigator and the gift routine skip a
    contact only when it has `source/rvp` **and** no group.
    - Only contacts the RVP flow creates get the tag and `text_tier = 'never'`.
    - An existing contact's tier and group are never changed. A test proves a friend who takes the test keeps both.
  - **Aggregates hide any count under 5.**
  - **The privacy page covers** what is kept, why, where (US), providers (including the AI tools Rod uses), who sees
    it, sign-in, retention, rights, the erasure proof, age and the transfer.
  - **Linked pre-existing contacts:** the page says Rod's separate records go through the manual route within 30 days.
  - **Breach notification** becomes a step in the breach plan.
- **Database Administrator** (shape agreed):
  - **A setting, `rvp_accounts_on` = off|staging|on**, default off. In staging, no contact is created, rows are marked
    `is_test`, and a test-row purge runs before launch.
  - **Answers are stored as `smallint[27]`** (option indexes), so they never look like a card number. The digit
    string is rebuilt for export.
  - **The 24-month retention reads `auth.users.last_sign_in_at`.**
  - **Erasure:** every `rvp_*` row can be deleted only under the erasure reason. A contact the RVP flow created is
    deleted; a pre-existing one is only unlinked.
  - **Backups:** `ops.snapshots` holds counts only.
- **Security:** NOT YET. The 7 MUSTs and addendum A–H (probes P31–P36) are now in this ADR. The next pass is on the
  staging build.
- **Designer:** the spec is `design/specs/rvp-accounts.md` in the personal repo, with:
  - `/rvp/signin/`, and a "Sign in" link in the RVP header and the footer;
  - one-time-code input, resend after 30 seconds;
  - no disabled buttons.
- **Philosopher:** fits with conditions. Who sees a result (above) and bank 1.0 first.

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
  - no Supabase key in the browser;
  - no grants;
  - every write through definer functions;
  - no group;
  - `text_tier = never`;
  - verified email only;
  - self-serve export and delete.
- The RVP result page gets one optional card and the site gets two pages (`/rvp/me/` and its ES twin). The test itself
  is unchanged.
- The `0.1-draft` results saved on staging are test data, and they're purged before launch.
