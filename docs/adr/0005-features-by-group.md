# 0005. Signed-in features by group

Date: 2026-11-26. Status: **proposed**. Nothing is built until Rod picks the starter features and the reviews below
pass. Deciders: Rod, who asked for this in the EA chat on 11/26 (DECISIONS): "we want to make a login for rodmjay,
here is the catch, we want to have a few different roles, depending on who the person is, mostly based on their
security group from supabase we want to attach different features to those groups". Software Architect leads.
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
- **Someone Rod knows** who signs in with an email Rod has linked to them also sees the features their group allows,
  in the same dashboard and the same nav. A cousin sees family features, a close friend sees friend features, and
  someone in no group sees only their own results.
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
  The response is the same neutral `200` in every case, so the form never reveals whether an email belongs to one of
  Rod's contacts.
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
- **Group:** on every request the function resolves `contact_privileges(contact_id)` → the chain, `opted_out` and
  `minor`. Nothing about the group is stored in the token or the browser, so a move or a removal takes effect on the
  next request.
  - `opted_out` → no group features.
  - Not linked, or in no group → a plain 0004 account.
  - The account never shows the group's name, the chain or who else is in it.

### Features: data in the database, never in the UI

- **A feature catalog, `site.site_features`:** key, EN and ES names, the data it reads, whether a minor may use it,
  `erase_on_revoke`, and a status `off | staging | on`. A feature at `on` is published, so only Rod's yes turns one on
  (EA brings it).
- **A mode, `site_roles_on` = `off | staging | on`,** audited and changed only through a function (like 0004's
  `rvp_set_mode`). A feature's effective status is the lower of its own status and the mode, which is how the
  database knows it's on staging.
- **Grants are a table, `site.site_feature_grants(group_key, feature_key)`** (DBA 11/26), with foreign keys to
  `contact_groups` and `site_features` and an audit trigger, so a misspelled key fails at write time.
  `group_effective()` returns their union along the chain, the same additive inheritance the texting commands use,
  so there's still one place that answers what a group may do (P12), and the portal's group page shows it.
  - `move_contact_group()` counts any grant row as a privilege, so moving someone into a group that grants any
    feature still needs Rod's yes.
- **The resolver, `site.features_for(auth_user_id)`**: the catalog features at the effective status, that
  the person's group grants, minus the minor-unsafe ones when `minor` is true, plus `rvp` for every account. The UI
  draws only this list. It has no group names or rules of its own.
- **Each feature has its own definer function and its own curated view** in schema `site`, returning only the
  columns that feature needs, scoped to the viewer where it can be. There is no generic "read a view" endpoint.

### Starter matrix (a proposal; Rod picks)

Groups, most to least trusted: `family_kids` › `family_close` › `family`, then `friend`, `girlfriend`, and accounts
with no group. Grants flow down: what `family` gets, `family_close` and `family_kids` get too. These are the active
keys. The older family layer groups (`family_parents`, `family_siblings` and the rest) are inactive and outside the
tree, so they get no grants; DBA tests inheritance on the live tree.

| Feature | What it shows | Proposed for | Minor OK |
|---|---|---|---|
| `rvp` | Your own RVP results (0004) | Every account | No (RVP is 18+) |
| `family-recipes` | The family recipe book: recipes Rod marks as family, with favorites | `family` | Yes |
| `events` | Events you're invited to, with your RSVP and the headcount | `family`, `friend` | Yes |
| `family-calendar` | Shared family events Rod marks shareable: title, day, time, venue | `family_close` | Yes |
| `kids-calendar` | Each child's own dates and pickup times with Rod, nothing else | `family_kids` | Yes |
| `wish-list` | Your own gift wish list, which you can add to; Rod sees it | `family_kids` | Yes |
| `photos` | Shared albums Rod picks | `family_close` (later) | Yes |
| `friends-news` | Rod's what's-new and links, the same as the friend texting menu | `friend` | No |

- `photos` needs a private store (a private Supabase bucket or Azure Blob with short signed links) and its own pass
  from Security, Compliance and Designer. It's listed so Rod can choose it, but it ships after the others.
- `girlfriend` gets no site features in this proposal.

### Least data per feature

- Every feature view follows `security/NEVER-SHARE.md`. No feature ever shows Rod's home or live location, money,
  health numbers, his employer, legal or court matters, or anyone else's contact details.
- `family-calendar` reads only a dedicated shared calendar that Scheduler fills on purpose, never Rod's primary
  calendar, and only events Rod marks shareable: no travel, no parenting schedule, no availability, no home. The place
  is a venue name only.
- `kids-calendar` is scoped to each child: a child sees only their own dates and times, never a sibling's, and never
  the whole group's. It also reads only the dedicated calendar.
- `events`: you see your own invite, your RSVP and the headcount. Other guests' names appear only when the host turns
  that on for the event **and** every listed guest is in the viewer's group or a higher one. Otherwise it's the
  headcount only.
- `family-recipes` reads the site's recipes plus a curated table, `site.recipe_marks(slug, feature_key)`. Rod's own
  tables (such as `recipe_favorites`) never carry a site flag. Every later feature follows the same pattern: its own
  curated table, never a flag on a table Rod uses.
- **Writes** are narrow and per feature: an RSVP, a wish-list line, a favorite. Each is a definer function that writes
  only the caller's own row. The per-feature size caps and per-user call limits live in SQL (`site.gate`, like
  `rvp.gate`).
- **On revoke:** each feature's `erase_on_revoke` says what happens to the person's rows. Wish-list lines and
  favorites are erased. An adult's RSVPs stay on the event as Rod's guest record, unlinked from the login. A minor's
  data is all erased at once. `erasure_run` and `erasure_holds` cover the `site` tables, as they do for RVP.

### Minors

- `contact_privileges()` sets `minor` from a known birthday, and treats anyone in the family tree without a known 18+
  birthday as a minor. That's the safe default.
- DBA checks that `contact_privileges()` returns `minor` and a known-birthday signal before this rule depends on it.
  If it doesn't, that's a small separate change.
- 0004's 18+ rule stays for self sign-up and RVP. A minor can have an account **only through a link Rod adds**, with
  a parent's consent recorded (who and when) before the link (Compliance 11/26):
  - for Rod's own children, Rod consents as their parent. Before any of them is linked, Legal Advisor checks whether
    the parenting order needs the other parent's agreement;
  - for any other minor in the family tree, that child's own parent must say yes, and Rod records it.
- **Under 13: no account at all** (COPPA). `grant_login` enforces it, never the UI. A contact with no known birthday
  can't be linked as a minor until Rod records one.
- A minor's account sees only features marked minor-safe, and no feature shows a minor's free text to anyone else. It
  collects nothing beyond the sign-in log and what the feature writes. It never gets RVP, never becomes a texting or
  mailing target, and its data is erased at once when the link is removed.

### Security

- **Edge Functions only.** `site-account` (sign-in) and `site-data` (features) are the only doors. Both carry every
  0004 control:
  - CORS rodmjay.com only, a body cap;
  - the user is checked with `GET /auth/v1/user` and taken from `sub` only, and the anon JWT is refused;
  - `Cache-Control: no-store` on every answer, and no edge cache for signed-in data.
- **Database role.** `site-data` connects as a dedicated role, `site_api`, which may only EXECUTE the `site.*`
  definer functions: no USAGE on `public`, no other grants, no BYPASSRLS. It follows the pattern RVP was built with
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
  shared function), a browser class, and the time. Every feature read or write goes to `site.feature_events` with the
  user, the feature, the action and the time, never the data itself. Writes also go through `audit_log` as usual.
- **Retention** (Compliance 11/26):
  - `signin_events` are kept 12 months, `feature_events` 6 months, and the IP hash is nulled at 30 days;
  - both are erased when the account is deleted or the link is revoked, unless a security incident is open;
  - the purge runs in the `retention-purge` job with a heartbeat, and is logged in `ops.retention_runs`;
  - `audit_log` rows follow the 0202 erasure path.
- **Rate limits.** 0004's caps apply unchanged, counted in SQL, with the same neutral answer and an incident when one
  trips. `site-data` adds 120 calls an hour per user. Three locked codes in a day on a linked account raises a sev 3
  incident to Security Officer. A linked person's first sign-in is one line in the morning text's "Done yesterday".
- **Probe** (Security, on staging):
  - `site_api` can't read `public.contacts`, `contact_groups`, `text_log`, `bills` or `calendar_events`;
  - a `friend` session can't fetch a `family` feature;
  - a moved person loses a feature on the next call;
  - a minor never gets a feature that isn't minor-safe;
  - an unlinked email that is on a contact gets a plain account.

### The nav

- `me` returns the person's feature list with each feature's EN and ES name and a "needs you" count (an unanswered
  RSVP, for example). The design system's nav draws exactly that list, with the red badge where the count is above
  zero.
- The nav keeps its size while `me` loads, so nothing jumps. It lives in the root layout, and every link is a Next
  `<Link>`.
- The routes are `/me/<feature>/` and `/es/me/<feature>/`. Designer writes the spec (`design/specs/site-roles.md` in
  the personal repo): nav, empty states, the invited sign-in, and EN and ES at 375 and 1280, light and dark.

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

1. This ADR goes to Security, Compliance, Designer and DBA. Rod picks the starter features (EA brings the list).
2. DBA's migration, with a rolled-back probe:
   - the `site` schema and `site_logins`, `site_features` and `site_feature_grants`;
   - `features_for`, `grant_login`, the revoke queue, `site.gate` and `recipe_marks`;
   - the roles, the two event tables and their purge;
   - the erasure coverage, and the `site_roles_on` mode, set to `off`.
3. Staging build behind `SITE_ROLES_ON`, after 0004's staging build, which it depends on. Only test contacts are
   linked on staging.
4. Passes: Security's probes, Compliance's go-live check, Designer's check, DBA's advisors.

**Review status (11/26):**
- Compliance: a conditional PASS at 40607c2f. Its conditions are written into this ADR (minors, consent, retention,
  calendars, events). `photos` of the kids waits for its own review.
- DBA: the shape is agreed with the changes above (the grants table, the mode, link checks, the revoke queue,
  erasure, the recipe marks, `site.gate`, the 0219 role pattern).
- Security and Designer: pending.
5. EA brings Rod one **"Publishes:"** yes covering the features he picked. Each later feature gets its own.

## Consequences

- Rod's contacts can now see a little of his data on the site. The design keeps that small and deliberate:
  - Rod links every person by hand;
  - each feature reads its own curated view;
  - the group is checked on every call;
  - nothing private is in the static build;
  - every sign-in and feature use is logged.
- Group changes now change what someone sees on the site, not only their texting menu. The portal's group page shows
  both.
- Each new feature is a catalog row, a view, a definer function, a screen and a grant. None of it touches the auth
  code.
