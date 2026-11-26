# 0005. Signed-in features by group

Date: 2026-11-26. Status: **accepted**, staging first. Rod picked the features on 11/26 (below), and his pick is
his "Publishes:" yes for the commands each group already has by text. Anything beyond the text menus goes back to
EA. Deciders: Rod, who asked for this in the EA chat on 11/26 (DECISIONS): "we want to make a login for rodmjay,
here is the catch, we want to have a few different roles, depending on who the person is, mostly based on their
security group from supabase we want to attach different features to those groups". His pick, the same day: "they
get their commands from the text prompting, but through the api, for example book coffee, it needs to function in
similar way but with better UI". Software Architect leads; Text Concierge owns the commands and the listener.
Reviewers:

- Security Officer and Compliance Officer, before any build.
- Database Administrator: every schema piece below is a request to it, and the names are proposals.
- Designer: the nav and every feature screen.

Extends 0004 (accounts: passwordless email code, Rod's personal Supabase, behind a setting that starts off). Uses the
contact group tree from the personal workspace's ADR 0003 (migration 0086): one group per person, privileges
inherited down the tree, read only through `contact_privileges()`, changed only through `move_contact_group()`.

## What a person gets

- **Anyone** can still use the site without signing in. Nothing changes for them.
- **Anyone who signs in** gets what 0004 gives: their own personality test results and the dashboard. If they
  haven't taken the test, the dashboard leads with a prominent card to take it (Rod 11/26).
- **Naming** (Rod and Philosopher 11/26): RVP is the system (Resources, Values, Processes). The 27 personality types
  sit over it, and **the personality test** on rodmjay.com reads a person's type. Account screens say "personality
  test" and "your personality test results", never "RVP". The types and the test itself don't change.
- **Someone Rod knows** who signs in with an email Rod has linked to them also gets their group's commands, the same
  ones their text menu has (coffee, what's new, leave friends and so on), in the dashboard and the nav, with buttons
  and cards in place of 1/2/3 texts.
- **Someone new** whose email matches no contact becomes a contact in a new `leads` group (Rod 11/26: "if they come
  from nowhere, and their email doesnt match any existing contact, they go into group, like leads"). Leads see their
  own results and the public pages, never family or friend commands.
- The nav shows only what the person may use. A feature they don't have isn't hidden behind a lock. It isn't there.

## Decisions

### One sign-in for the whole site

- Sign-in stays exactly as 0004 defines it: Supabase Auth, an email code checked by our own function, public sign-up
  off, no passwords, no Google or Apple, the browser holds no Supabase key.
- 0004's function `rvp-account` is renamed **`site-account`** before it's built, because it now signs people in for
  more than RVP. Its RVP actions (`save`, `me`, `export`, `delete`) keep their shape, and the database schema `rvp`
  stays as built; new objects go in schema `site`. The auth admin function becomes `site-auth-admin` (create user,
  delete user, and now **sign out user**).
- **Two ways in, one code step** (Rod 11/26: "make sure that the flow works from personality test to logged in, and
  account created, and then if people havent taken their test, make that a prominent link on their dashboard"):
  - **(a) Test first.** Take the test → the result page offers "Save my result" → email → code → the account exists,
    the result is saved to it as a take, and the person stays on the result page, then goes to the dashboard. A
    "Already saved a result? Sign in instead" link swaps the card to an email-only sign-in with the same code step;
    the result is saved as a new take on that account.
  - **(b) Sign in first.** `/signin/` → email → code → dashboard. With no saved result, the dashboard leads with one
    filled "Take the personality test" card (or "Continue the test" when a partial test is in the browser). After
    the test the result saves to the account automatically ("Saved to your dashboard") and the result card takes
    the test card's place.
  - Both paths use `site-account` `login` (or `start` from the result page) and `verify`. Saving the browser's
    result to the signed-in account is 0004's `save {fragment}`, for new and existing accounts (Security J): the
    account comes from the verified token only, and the fragment goes through the same server-side decode, size cap,
    take limit (20 a day, 200 in all) and rate limit. `login` creates an account for a new email the same way `start`
    does (migration 0223).
  - **No auto-save** (Compliance 11/26): a signed-in person saves with one tap, "Save to my dashboard". It saves
    only that result, on that tap, and only if the person's recorded consent covers results. If it doesn't (a lead's
    sign-in consent covers only email and name), the tap first shows 0004's results consent box, unticked, and records
    it. `rvp.me` says whether the recorded consent covers results. An off-by-default "Save my results automatically"
    setting with its own consent line could come later if Rod wants it; it isn't in v1.
  - Each path has an end-to-end test on staging (Playwright, against a test mailbox, `is_test` rows).
- The response to `start` and `login` is the same neutral `200` in every case, and it takes the same time: the mail
  is queued the same way for linked, unlinked and unknown emails, so neither the body nor the timing reveals whether
  an email belongs to one of Rod's contacts. Every creation counts against 0004's caps.
- **The order on first sign-in** (Designer's spec): code first, then a one-time "Before you start" screen with the
  consent below. Consent comes after the code so the sign-in reply stays neutral. Compliance agreed on 11/26, with
  these conditions:
  - `site-data` refuses every feature call until the consent is recorded on the server. The screen is never only a
    gate in the browser;
  - the box starts unticked, and it is recorded with source, date and the hash of the wording shown, which must be on
    the allowlist;
  - declining deletes the account and its events, not only the session. The only thing kept is an anonymous count,
    with no email and no contact link;
  - a minor sees the short parental-consent notice instead, and the parent's consent must already be on the link.
- **Consent for linked people** is its own box (Compliance 11/26, the wording for commands), unticked, recorded at
  the verified step by the signed-in holder, loaded into `consent_wordings` as a new version with its hash. It never
  names a group. A minor sees a short notice instead, and the parent's consent is recorded with the link.
  - EN: "I'm signing in with an email Rod Johnson linked to me. I understand the site keeps my sign-in email, the
    times I sign in, and the requests I make, such as asking Rod for coffee. Rod's assistant tools help handle them,
    and Rod decides. Rod already has my contact details. None of this is sold or used for ads. This site won't text
    or email me, except that if I already text Rod's line and haven't opted out, the answer to a request may also
    come by text. I can delete my account from my dashboard at any time, and that deletes this data."
  - ES: "Entro con un correo que Rod Johnson vinculó conmigo. Entiendo que el sitio guarda mi correo, las fechas y
    horas en que inicio sesión y las solicitudes que hago, como pedirle un café a Rod. Las herramientas de asistente
    de Rod ayudan a gestionarlas, y Rod decide. Rod ya tiene mis datos de contacto. Nada de esto se vende ni se usa
    para publicidad. El sitio no me enviará mensajes ni correos, salvo que, si ya escribo a la línea de texto de Rod
    y no me he dado de baja, la respuesta a una solicitud puede llegar también por mensaje. Puedo eliminar mi cuenta
    desde mi panel en cualquier momento, y así se borran estos datos."
  - **People who sign in without a match** (leads) see a box that says Rod keeps their email and name as a contact so
    he knows who signed in, without the word "lead" and without a results claim when they haven't taken the test. It
    keeps the 18+, no-sale, no-texts and no-mailing-list lines, and it's a new `consent_wordings` version (Compliance
    11/26). Saving a result later uses 0004's box.
  - The privacy and terms PR adds linked sign-in, leads, the logs, request text, and the AI tools that handle
    requests as recipients, in EN and ES. A sincere "is this an AI?" still gets a straight yes.

### Identity: a contact, only through an email Rod linked

- A signed-in user maps to a `contacts` row **only** when the email they proved with the code is on a new link
  record, `site_logins`. Being on `contact_methods` alone is not enough.
  - Why: `contact_methods` emails come from imports (phone, LinkedIn, Gmail). Some are old, shared or work
    addresses. Proving you read an inbox shouldn't by itself open family data.
  - A link (`site.site_logins`) holds: contact id, the email (unique index on its lower case), who added it, when,
    and when it was revoked. `site.grant_login` checks that the email is on a live `contact_methods` row (kind
    `email`) and that the contact isn't soft-deleted, and `features_for` checks both again on every call, so a deleted
    method or contact loses access at once.
  - One contact can have several linked emails. One email links to at most one contact. If an email would match two
    contacts, no link is made and Relationship Manager merges them first.
- **Adding a link is a grant**, so it follows `move_contact_group()`'s rule: only Rod, or Relationship Manager
  recording Rod's decision (`p_by` = `rod` or `relationship-manager: <Rod's decision>`), through a definer function
  `site.grant_login(contact, email, by)`. Removing a link needs no yes. SQL can't call the Auth admin API, so a
  revoke writes a queue row, and `site-auth-admin` drains it: it signs that user out everywhere and deletes the auth
  user.
- **Every link needs a known age** (DBA 11/26): a known birth year, or `adult_confirmed` on the contact. That covers
  friends as well as family, because a friend with no birthday on file could be a child.
- **Links are re-confirmed yearly**, because email addresses get reassigned. An unconfirmed link lapses and the person
  falls back to a plain account.
- **The contact comes only from the verified token** (Security 11/26). Every function derives the contact inside the
  database from the verified auth `sub`. None of them takes a contact id or user id from the caller.
- **Rechecked on every call:** the link isn't revoked, isn't a lapsed yearly link, and its email is still on the
  contact's undeleted `contact_methods`. The email compared is the confirmed `auth.users.email`, never a claim.
  Changing the email in Auth stays disabled (0004's hook refuses it).
- **Group:** on every request the function resolves `contact_privileges(contact_id)` → the chain, `opted_out` and
  `minor`. Nothing about the group is stored in the token or the browser, so a move or a removal takes effect on the
  next request.
  - `opted_out` → no group features.
  - Not linked, or in no group, or a lead → their own results only.
  - The account never shows the group's name, the chain or who else is in it.

### Leads: new people get a contact and the least-privileged group (Rod 11/26)

- **`leads`** is a top-level contact group with no commands, no menu file and no conversation. Because it grants
  nothing, `move_contact_group()` may place someone there without Rod's yes. Lead commands, if Text Concierge defines
  any, are granted to the group by Rod's yes through `group_privileges`, never one person at a time.
- **Creation** (`site.account_create_lead`, a definer function owned by the link owner) runs only when the proven
  email matches no live `contact_methods` row and no `site_logins` link. It creates the contact with only the email,
  any name they give, `text_tier = 'never'`, the tags `source/rodmjay.com` and `source/site-signin` (or `source/rvp`
  from the test), the consent record, and the `leads` membership. The contact id is stored on the account so a
  repeat sign-in finds it. 0004's test path joins `leads` too, in a new migration.
- **An email that matches an existing contact is never auto-linked or moved.** That person gets their own results
  only until Rod links the email (Identity, below).
- **The contact is made only after a verified code and consent.** `account_create_lead` only creates: it never
  touches an existing contact and makes at most one lead per auth user. The email match is lower-cased against live
  `contact_methods` and `site_logins`. The name is capped plain text with control characters stripped, treated as
  unverified data. The sign-in reply stays identical for matched and unmatched emails (Security I, Compliance c).
- **A lower cap for leads** (Security I): 20 new leads a day, with an incident when it's hit, inside 0004's 200 new
  users a day. Creating a lead raises no `automation_events`, Todoist task, `ask-rod` prompt or text; the morning
  text carries one daily count.
- **Quiet leads** (Compliance 11/26):
  - a lead with no saved results gets a reminder, then the account is deleted and the contact soft-deleted 12 months
    after the last sign-in;
  - a lead with results keeps 0004's 24 months;
  - an unverified sign-up is purged at 24 hours, as before;
  - the soft delete runs only when nothing else is on the contact (no calls, texts, other group, relationship or
    other data). Otherwise it raises a `waiting_for` row for Rod;
  - a lead Rod moves to a real group leaves `leads` and is exempt.
- **A person's own delete** erases an auto-made contact that holds nothing else, through `erasure_run` (0202), not a
  soft delete, so the email and name don't stay in the database. Expiry stays a soft delete.
- **Everything else fails closed on `leads` and its tag:** texting, gifts and mailing, Investigator (no social,
  broker or people lookups), the Quo contact sync, the portal's contact views, `search_docs` and the new-contact
  approval flow.

### Features are the group's text commands (Rod 11/26)

One command list, two front ends. The site never has a command the person's text menu doesn't.

- **The catalog is `menu_commands`** (key, label, active), the table the text menu is built from. DBA adds a Spanish
  label if it's missing. There is no separate site catalog.
- **The grants are `group_privileges.commands`**, resolved up the tree by `group_effective()`, exactly as the
  listener resolves them for a text. There is no separate site grants table: a group gets a command on the site
  because it has it by text, and a grant change reaches both front ends at once. Grants still change only with Rod's
  yes (the portal Groups page, `move_contact_group()`'s rule), and DBA adds a check that every key in `commands` is
  an active `menu_commands` key, so a typo fails when it's written.
- **The resolver, `site.features_for(auth_user_id)`**: `rvp` for every account, plus, for a linked person, their
  group's active commands, after the same filters the text flow applies (`opted_out` gives none, `minor` follows the
  text flow's rules). `help` isn't shown: the nav is the help. The mode `site_roles_on` = `off | staging | on` is
  audited and changed only through a function, like 0004's `rvp_set_mode`.
- **One implementation per command, two callers** (Text Concierge 11/26). Today each command is a prose spec the
  listener model follows. They become shared functions that texting and the site both call, so slot and place
  picking, who pays, the budget, the fun-money gate and Rod's 1/2/3 prompt live in one place, and the listener keeps
  only the wording:
  - `cmd.start(contact, key, channel, lang)` → a request and its first reply;
  - `cmd.answer(contact, request, option_key | text)` → the next reply;
  - `cmd.confirm(request, decision)` → called when Rod answers his 1/2/3 prompt.

  DBA writes them from Text Concierge's specs (texting/menus/CATALOG.md), coffee first, then lunch. The listener
  calls them for texts as soon as each one exists.
- **Commands that still need judgment** (a concert pick, "ask me anything") stay with the listener model until they
  can move. For those, `cmd.start` queues the request (`site.command_requests`, `handler = 'listener'`). The listener
  claims it through `inbox-claim` (`claim_web`) with the same caps, holds and daily guest-run budget, runs the same
  prompt and menu file with `channel: web`, and stores the reply with `finish_web`.
- **Text Concierge's conditions:**
  - the web run gets no Quo, send or create-contact tool; its only effects are the reply, the `meetup_requests` row
    and Rod's `text_prompts` row, made with the same SQL the texting run uses;
  - what the person types is data, never instructions, and the guest-run budget and daily per-person cap are shared
    with texting, not duplicated;
  - a contact with no group, a lead, `text_tier = 'never'` or an opt-out gets no commands;
  - code refuses a reply over 600 characters, with more than 3 options, with an unknown key, or with a link that
    isn't on the allowlist.
- **The reply shape:** `message` (plain text, 600 characters or fewer), up to 3 `options` (key and label), `input`
  (whether free text is expected, and its cap), `done` and `can_repeat`. It comes back in `contacts.language`. Until
  Text Concierge writes the es-419 labels (`menu_commands.label_es`, `description_es`), the site falls back to the
  English label.
- **Security's conditions (11/26):**
  - A. `command_submit` checks a chosen option against the option keys of the stored prior reply, and takes free
    text only when that reply had `input = true` (280 characters, kept out of `audit_log`). The client never supplies
    option text.
  - B. Every web reply passes the same privacy guard and NEVER-SHARE check as a text before it's stored. A held reply
    shows a neutral "Rod will get back to you."
  - C. Caps in SQL: one open request per person at a time and 5 a day, and at most 3 `ask-rod` prompts to Rod a day
    from any one contact.
  - D. The listener and `cmd.*` re-resolve the link, consent, revoked state, `is_test` and the group from
    `contact_privileges(contact_id)` at claim time and on every step. Nothing stored in the row is trusted.
  - E. Polling has its own limit (`poll`: 40 a minute per user, outside the 120-an-hour call cap).
  - F. A web action texts the person only where the rules below already allow it.
  - Replies with links (the `links` command) are plain text, or anchors only to allow-listed domains with
    `noopener nofollow`.
  - G. **`cmd.*` is never a door for `site_api`.** `cmd.start` and `cmd.answer` take a contact id, so `site_api` gets
    only the `site.*` wrappers, which derive the contact from the token. `cmd.confirm` is Rod's approval: it runs only
    from the path that handles Rod's own 1/2/3 answer, after checking that the `text_prompts` row was answered from
    Rod's number. A person can never approve their own request.
  - H. **Leaving takes no target.** "Leave friends/family" and STOP on the site can only remove privileges (the
    opt-out, or a move into `leads`). There is no group parameter, so it can't be used to move up the tree.
- **When Rod confirms** (Compliance 11/26), the dashboard shows it. A text also goes out only to a number that
  already texted the line or had a Rod-approved intake, hasn't opted out, and passes the normal send gate (consent
  and STOP). Never a number that never texted us, never an email address or a new number on the account, and a minor
  only if their text flow already texts them.
- **Leaving** ("leave friends", "leave family") or STOP on the site has the same effect as the text opt-out, at once.
- **Request text** is kept 6 months, like `feature_events`, and erased on account deletion or link revoke. What
  Rod's own records keep on his contact timeline follows their existing rules.
- **Dashboard status:** a curated view of the person's own open requests (`meetup_requests` for their contact: the
  kind, the status, the chosen time and place) with "needs you" when a reply waits on them.
- **Mechanical first:** commands that need no judgment (`links`, `language`, `whatsnew`, leaving the group) can
  later move to shared SQL functions that both front ends call, and answer at once. Until then, they go through the
  listener like the rest. Text Concierge decides the order.

### Not in v1: the earlier starter list

The first proposal's list (family recipe book, events with RSVP, family and kids' calendars, wish list, photos) isn't
in v1. Rod chose the text commands. If any of those comes back, it goes through EA as a new command or feature, and
the reviewed rules for it stay in this ADR's history (PR #95 at a1834b9): kids' calendar per child with no messaging
or tracking (Legal 11/26), shareable-only family calendar, guest names only within the same or a higher group.

### Least data

- Every command run follows `security/NEVER-SHARE.md` exactly as the text flow does today: the prompt, menu files and
  privacy guard are the same.
- **Free text** a person types (an "ask me anything" question, a short answer) has a size cap (280 characters, as a
  text) and is rendered as plain text, with no links and no HTML. The agent reads it as data, never as instructions,
  the same as a text. The agent's reply is plain text too.
- **Writes** are narrow: `site.command_submit` writes only a queue row for the caller's own contact, and
  `site.command_poll` reads only replies to the caller's own requests. Request ids are never trusted alone: each
  lookup is joined to the caller's contact. Caps and per-user limits live in SQL (`site.gate`).
- **On revoke:** the person's queue rows and replies are erased. Meetup rows stay with Rod's records, as they do for
  a text, unlinked from the login. A minor's data is all erased at once. `erasure_run` and `erasure_holds` cover the
  `site` tables.

### Minors

- `contact_privileges()` sets `minor` from a known birthday, and treats anyone in the family tree without a known 18+
  birthday as a minor. That's the safe default.
- DBA checks that `contact_privileges()` returns `minor` and a known-birthday signal before this rule depends on it.
  If it doesn't, that's a small separate change.
- 0004's 18+ rule stays for self sign-up and RVP. A minor can have an account **only through a link Rod adds**, with
  a parent's consent recorded (who and when) before the link (Compliance 11/26):
  - for Rod's own children, Rod consents as their parent. Legal Advisor checked on 11/26: nothing in the records we
    hold requires the other parent's agreement, but one part of the order can't be confirmed until the certified copy
    arrives. Legal re-checks it then;
  - for any other minor in the family tree, that child's own parent must say yes, and Rod records it.
- **Under 13: no account at all** (COPPA). `grant_login` enforces it, never the UI. A contact with no known birthday
  can't be linked as a minor until Rod records one.
- A minor's account gets only what the text flow already gives that minor (no conversation mode, the same command
  rules), and nothing a minor types is shown to anyone else. It collects nothing beyond the sign-in log and the
  command requests. It never gets RVP, never becomes a texting or
  mailing target, and its data is erased at once when the link is removed.

### Security

- **Edge Functions only.** `site-account` (sign-in) and `site-data` (features) are the only doors. Both carry every
  0004 control:
  - CORS rodmjay.com only, a body cap;
  - the user is checked with `GET /auth/v1/user` and taken from `sub` only, and the anon JWT is refused;
  - `Cache-Control: no-store` on every answer, and no edge cache for signed-in data.
- **Database role.** `site-data` connects as a dedicated role, `site_api`, which may only EXECUTE a named allow-list
  of functions (Security 11/26): `site.me`, `site.command_submit`, `site.command_poll` and `site.my_requests`, never
  `site.*` as a whole: no USAGE on `public`, no other grants, no
  BYPASSRLS. `grant_login`, the grant writers and `move_contact_group` live in a schema `site_api` can't reach, so a
  leaked `site_api` can't grant itself anything. It follows the pattern RVP was built with
  (migration 0219, Security's ruling): NOLOGIN with no password, each call does `set local role`, and every function
  starts with `require_role`. The definer functions are owned by `site_owner`, which holds column-level SELECT only on
  the source columns the features need. The grant and erase functions have their own owner roles, as RVP's do. RLS
  stays on everywhere, and `anon` and `authenticated` hold no grants (the role-drift and grant-sweep audits cover
  `site` too).
- **Every call checks again.** `site-data` resolves `features_for` on each request and refuses a feature that isn't
  in it. A 15-minute access token is the longest anyone keeps access after a change. Revoking a link also signs out
  every session.
- **Private data is never in the static build.** Feature pages are shells. Their data loads after sign-in from
  `site-data`. A page's code being public is fine, but its data never is. Signed-in pages are `noindex` and carry no
  analytics (psh ADR 0059 is public pages only).
- **Audit.** Every sign-in attempt goes to an append-only `site.signin_events`: the auth user, the linked contact if
  any, the result (ok, wrong code, locked, refused), an IP hash (the same salted helper RVP uses, exposed through one
  shared function, with its salt in Vault), a browser class, and the time. Every feature read or write goes to `site.feature_events` with the
  user, the feature, the action and the time, never the data itself. Writes also go through `audit_log` as usual.
- **Retention** (Compliance 11/26):
  - `signin_events` are kept 12 months, `feature_events` 6 months, and the IP hash is nulled at 30 days;
  - both are erased when the account is deleted or the link is revoked, unless a security incident is open;
  - the purge runs in the `retention-purge` job with a heartbeat, and is logged in `ops.retention_runs`;
  - `audit_log` rows follow the 0202 erasure path: the who, when and operation stay, and erasure nulls the row
    contents for that contact. Emails and IPs in `site` columns are on `audit_excluded_cols`.
- **Rate limits.** 0004's caps apply unchanged, counted in SQL, with the same neutral answer and an incident when one
  trips. `site-data` adds 120 calls an hour per user. Three locked codes in a day on a linked account raises a sev 3
  incident to Security Officer. A linked person's first sign-in is one line in the morning text's "Done yesterday".
- **Probe** (Security, on staging):
  - `site_api` can't read `public.contacts`, `contact_groups`, `text_log`, `bills` or `calendar_events`;
  - a `friend` session can't fetch a `family` feature;
  - a moved person loses a feature on the next call;
  - a minor never gets a feature that isn't minor-safe;
  - an unlinked email that is on a contact gets a plain account;
  - `grant_login` and `move_contact_group` are refused as `site_api`;
  - a foreign auth id;
  - email variants: case, plus, dot and unicode;
  - revoking a link, or removing the contact's email, while a token is live;
  - two contacts sharing one email;
  - IDOR on request and reply ids;
  - XSS in a typed answer and in an agent reply;
  - a site command from a `friend` account can't run a `family` command, and the listener resolves the group from the
    queue row's contact (never a phone number) for `channel = 'web'`;
  - the web run has no tool that texts or emails the person; a malformed agent reply is rejected, never shown;
  - `site_api` calling any `cmd.*` function is refused, and so is leave with a target parameter;
  - a lead flood hits the cap and raises an incident;
  - case, plus and dot variants of an existing contact's email never create a lead;
  - an oversized or forged `save` fragment is refused;
  - holds (`pause_non_rod`, the daily cap, the guest-run budget) stop web commands the same as texts;
  - a real contact on staging;
  - UPDATE and DELETE refused on the event tables;
  - after a revoke, access ends on the very next call, before `site-auth-admin` drains the queue;
  - the consent hash is on the allowlist, and calling `site-data` directly can't skip the consent screen;
  - the 30-day IP-hash null and the 6- and 12-month purges actually run;
  - the rotation test.
- **Staging shares Rod's one database** (Security 11/26). `site_logins.is_test` marks test links. Staging mode serves
  only test links, the listener answers `is_test` requests without queueing a real prompt to Rod, and the mode comes from server config,
  never from the client.
- **Residual risk, stated.** If the `site_api` path were compromised, it could read the queued requests and replies of
  every linked person and submit commands as them (each still needs Rod's 1 to do anything), and nothing else. 0004's fixed call shape and role guard limit it, and a rotation test is part
  of the staging probe.

### The nav

- **The nav** (Designer 11/26): with about a dozen commands, the second sticky row on `/dashboard/` and `/me/*` is
  **Dashboard | Requests | Ask Rod**. Requests carries the red badge only when the person must pick something. Ask
  Rod opens the commands as a menu (a bottom sheet under 840px), and the same commands fill a grid on the dashboard.
  "Leave friends/family" is a row under Your data, behind a confirm dialog. There are no group names and no locks.
- **`me` returns,** in a stable order:
  - per command: `key`, `label_en`, `label_es`, `description`, `kind` (`ask | read | setting | leave`), `held`, and
    the group's label for the leave row;
  - per request: `id`, command key, a one-line summary, `status` (`waiting_you | waiting_rod | working | done |
    failed`) and when it was made;
  - whether a personality test result exists, and the latest one.
- v1 calendars are agenda lists only, with no month view.
- The nav keeps its size while `me` loads, so nothing jumps. It lives in the root layout, and every link is a Next
  `<Link>`.
- The routes are `/me/<feature>/` and `/es/me/<feature>/`. Designer writes the spec (`design/specs/site-roles.md` in
  the personal repo, written 11/26): nav, empty states, the invited sign-in, and EN and ES at 375 and 1280, light
  and dark.

## Why not the alternatives

- **Putting the group in the token** (a Supabase custom access token hook): fewer database calls, but a moved or
  removed person keeps access until the token refreshes, and the browser could read their group. We rejected it.
- **Linking any verified email that's on a contact:** simpler, but imported emails aren't proof of who someone is,
  and the cost of a wrong match is family data. Rod links on purpose instead.
- **Letting the browser read views through Supabase with RLS policies:** that breaks the site's rule that it never
  calls Supabase directly, and it puts the access logic in policies spread across tables. We rejected it.
- **A separate login system for family** (passwords, or psh's IdP): two systems to run for one site. 0004's sign-in
  already exists, so we extend it.

## Rollout gates

1. Reviewed by Security, Compliance, Designer, DBA and Legal; Rod picked the text commands (11/26). The delta for
   commands gets a short re-check by Security and Compliance, and Text Concierge agrees the listener change.
2. DBA's migration, with a rolled-back probe:
   - the `site` schema and `site_logins`, and a Spanish label and a key check on `menu_commands`;
   - `features_for`, `grant_login`, the revoke queue, `site.gate`;
   - `command_requests`, `command_replies`, `command_submit`, `command_poll`, `my_requests`, and the
     `inbox-claim` actions the listener uses for them (`claim_web`, `finish_web`);
   - the `cmd.*` functions, coffee first, from Text Concierge's specs;
   - the `leads` group, `account_create_lead`, 0004's test path joining `leads`, and the quiet-lead purge;
   - the new consent wording version in `consent_wordings`;
   - the roles, the two event tables and their purge;
   - the erasure coverage, and the `site_roles_on` mode, set to `off`.
3. Staging build behind `SITE_ROLES_ON`, after 0004's staging build, which it depends on. Only `is_test` links are
   served on staging.
4. Passes: Security's probes, Compliance's go-live check, Designer's check, DBA's advisors.
5. Rod's 11/26 pick is the "Publishes:" yes for the commands each group already has by text, so production follows
   the passes. A command or feature that isn't in a text menu needs its own yes through EA.

**Leads re-check (11/26):** Security PASS with G to J; Compliance PASS with conditions (a) to (c). All written in
above.

**Review status (11/26, text commands):** Security PASS with conditions A to F (written in above); Compliance PASS
with conditions (the new consent wording, texts on confirmation, leaving, request retention, the privacy page);
Text Concierge agrees and makes the listener change; DBA writes the migration. The `leads` change (Rod, later
11/26) needs a short Security and Compliance re-check, including the quiet-lead period.

**Review status (11/26, before the switch to text commands):**
- Compliance: a conditional PASS at 40607c2f, and a yes at 72f8f1a to the consent screen coming after the code. Its
  conditions are written into this ADR: minors, consent and its screen, retention, calendars and events. `photos` of
  the kids waits for its own review. Its go-live check runs on the built screens.
- DBA: the shape is agreed with the changes above: the grants table, the mode, link checks, the revoke queue,
  erasure, the recipe marks, `site.gate`, the 0219 role pattern and a known age on every link.
- Security: PASS on the design at 72f8f1a, recorded in its message. Later pushes (Legal's answer, Compliance's
  screen conditions, the added probes) need its re-read.
- Legal Advisor: answered on the kids' accounts (11/26).
- Designer: the spec is written (`design/specs/site-roles.md`). Its design check runs on staging.

## Consequences

- Rod's contacts can now see a little of his data on the site. The design keeps that small and deliberate:
  - Rod links every person by hand;
  - the site runs only the commands each group already has by text, through the same guarded agent;
  - the group is checked on every call;
  - nothing private is in the static build;
  - every sign-in and feature use is logged.
- Group changes now change what someone sees on the site, not only their texting menu. The portal's group page shows
  both.
- A new text command reaches the site with no site change beyond a screen, because both front ends read the same
  command list. None of it touches the auth code.
- Web commands share the listener's budget and Rod's computer: if the listener is down, web commands wait, as texts
  do, and the page says so after 2 minutes.
