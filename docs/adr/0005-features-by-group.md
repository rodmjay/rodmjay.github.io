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
- **Anyone who signs in** gets what 0004 gives: their own RVP results and the dashboard.
- **Someone Rod knows** who signs in with an email Rod has linked to them also gets their group's commands, the same
  ones their text menu has (coffee, what's new, leave friends and so on), in the dashboard and the nav, with buttons
  and cards in place of 1/2/3 texts. Someone in no group sees only their own results.
- The nav shows only what the person may use. A feature they don't have isn't hidden behind a lock. It isn't there.

## Decisions

### One sign-in for the whole site

- Sign-in stays exactly as 0004 defines it: Supabase Auth, an email code checked by our own function, public sign-up
  off, no passwords, no Google or Apple, the browser holds no Supabase key.
- 0004's function `rvp-account` is renamed **`site-account`** before it's built, because it now signs people in for
  more than RVP. Its RVP actions (`save`, `me`, `export`, `delete`) keep their shape, and the database schema `rvp`
  stays as built; new objects go in schema `site`. The auth admin function becomes `site-auth-admin` (create user,
  delete user, and now **sign out user**).
- **Invited sign-in.** A person Rod has linked (below) can sign in without taking the test first. `site-account`
  `login` creates their auth user on first use. Everyone else still gets an account only through the RVP save flow.
  The response is the same neutral `200` in every case, and it takes the same time: the mail is queued the same way
  for linked, unlinked and unknown emails, so neither the body nor the timing reveals whether an email belongs to one
  of Rod's contacts. Invited creations count against 0004's caps.
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
- **Consent for invited people** is its own box (Compliance 11/26), unticked, recorded at the verified step by the
  signed-in holder, with its wording hash on the allowlist. It never names a group. A minor sees a short notice
  instead, and Rod's (or the other parent's) consent is recorded with the link.
  - EN: "I'm signing in with an email Rod Johnson linked to me. I understand the site keeps my sign-in email, the
    times I sign in, and what I do in a feature, such as an RSVP or a wish-list line. Rod already has my contact
    details. None of this is sold or used for ads, and it is never used to text or email me. I can delete my account
    from my dashboard at any time, and that deletes this data."
  - ES: "Entro con un correo que Rod Johnson vinculó conmigo. Entiendo que el sitio guarda mi correo, las fechas y
    horas en que inicio sesión y lo que hago en una función, como una confirmación de asistencia o una línea de mi
    lista de deseos. Rod ya tiene mis datos de contacto. Nada de esto se vende ni se usa para publicidad, y nunca se
    usa para enviarme mensajes ni correos. Puedo eliminar mi cuenta desde mi panel en cualquier momento, y así se
    borran estos datos."
  - The privacy and terms PR adds linked sign-in, these logs, and the AI tools Rod uses as recipients.
  - Compliance re-words the examples ("an RSVP or a wish-list line") for commands, such as asking Rod for coffee.

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
  - Not linked, or in no group → a plain 0004 account.
  - The account never shows the group's name, the chain or who else is in it.

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
- **The same backend runs the command** (Rod: "it needs to function in similar way").
  - Today a text command is a row in `inbound_texts`. The listener on Rod's computer claims it through `inbox-claim`
    and runs the guarded agent with `GUEST_PROMPT` and the group's menu file. Rod's approval still comes by his
    1/2/3 text (`ask-rod`, `meetup_requests`).
  - A site command is a row in a sibling queue, `site.command_requests`: the contact (from the token), the command
    key, the step (start, a chosen option, or a short free-text answer), and `channel = 'web'`. The listener claims
    it the same way, with the same caps, holds and daily guest-run budget. It runs the same prompt and menu file
    with `channel: web`, which changes one thing: instead of texting the person, the run ends with a structured reply
    that code checks and stores in `site.command_replies`.
  - **The reply shape:** `message` (plain text, 600 characters or fewer), up to 3 `options` (key and label, such as
    three coffee times with their places), `input` (whether a short free-text answer is expected, as in "ask me
    anything") and `done`. Code rejects anything else, and the UI renders it as cards and buttons.
  - The browser asks `site-data` for the reply (`poll`, every 2 seconds for up to 2 minutes) and shows "RodBot is on
    it" meanwhile. A pick sends the next step to the same request.
  - Rod's side doesn't change: his 1/2/3 approval text, the calendar event, the meetup row. When Rod confirms, the
    dashboard shows it. The person gets a text only if they already use RodBot by text and haven't opted out
    (Compliance to confirm).
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

- `me` returns the person's features in a stable order: `key`, `name_en`, `name_es` and `needs_you` (a count of
  steps waiting on that person, such as a coffee time to pick). The design system's nav draws exactly that list as a
  second sticky tab row on `/dashboard/` and `/me/*`, with "Dashboard" always first and the red badge only when
  `needs_you` is above zero. There are no group names and no locks anywhere.
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
     `inbox-claim` actions the listener uses for them;
   - the roles, the two event tables and their purge;
   - the erasure coverage, and the `site_roles_on` mode, set to `off`.
3. Staging build behind `SITE_ROLES_ON`, after 0004's staging build, which it depends on. Only `is_test` links are
   served on staging.
4. Passes: Security's probes, Compliance's go-live check, Designer's check, DBA's advisors.
5. Rod's 11/26 pick is the "Publishes:" yes for the commands each group already has by text, so production follows
   the passes. A command or feature that isn't in a text menu needs its own yes through EA.

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
