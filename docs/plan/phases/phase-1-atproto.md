# Phase 1 — AT Protocol foundations

The lexicon and auth are the load-bearing decisions of the whole project.
Get them right before building anything on top.

---

### 0101 — Architecture note: how we use AT Protocol

Depends on: —
Goal: a short in-repo note describing how Rhizome maps onto AT Protocol
concepts, so future contributors don't have to re-derive it.
Scope in:

- Explain: DID, PDS, repo, collection, record, lexicon, PLC directory.
- State which of these we use directly and which we delegate to Bluesky infra.
- Sequence diagram (ASCII) of: OAuth login (client metadata → authorize
  redirect → callback → DPoP-bound session) → write a media record → read
  another user's records.
- **A "schema evolution" section**, because there is no `ALTER TABLE` here
  and the consequences are not obvious. Records live in thousands of repos
  we cannot write to, so the protocol removes the need to migrate by
  forbidding breaking changes outright:
  - Allowed on a published lexicon: adding **optional** fields, deprecating
    a field.
  - Forbidden: removing a field, renaming one, changing a type, or adding a
    **required** field.
  - A real break means publishing a **new NSID** and reading both
    collections during the transition. The old one never fully disappears.
  - Therefore reads must tolerate everything ever written: unknown fields
    ignored, absent optional fields defaulted. This is what makes migration
    unnecessary rather than merely painful.
  - Records are upgraded **lazily, on write**: we cannot write to a user's
    repo, but they can, through the app. Any edit rewrites the record in the
    current shape, so active users migrate themselves. Dormant users never
    do, which is fine given the previous point.
  - There is no moment when we can claim everyone is on the new version. A
    "rebuild my library" button can be offered; it cannot be imposed.
- State plainly that **records are world-readable**. Nothing in a user's
  repo is private, which is why the anti-spoiler filter is a courtesy over
  public data and not an access control.
- File: `docs/architecture/atproto.md`.

Scope out: any code.

### 0102 — Draft lexicon: media entry (film / series)

Depends on: 0101
Goal: a lexicon definition for one media entry in a user's list, scoped to
films and series but shaped to accept games/books later without a breaking
change.
Scope in:

- NSID chosen, with rationale. **Draft under an experimental namespace**
  (`app.rhizome.experimental.media.entry`) and promote to
  `app.rhizome.media.entry` only once the shape has survived being built on.
  The spec is explicit that a lexicon is frozen as soon as a third party
  adopts it, _even without our permission_ — so the point of no return is
  the day someone else reads us, not the day we declare V1. An experimental
  namespace moves that point to a date we choose.
  Test records written under the experimental NSID are simply left behind in
  their own collection when we promote; nothing needs migrating.
- Fields: `mediaType` (film|series), `externalRef` ({ source: "tmdb", id: string }), `status` (toWatch|watching|done|dropped), `progress` (see 0103), `rating` (optional number), `note` (optional string), `spoiler` (optional boolean — the author flagging their own note, see 0704), `createdAt`, `updatedAt` (optional), `startedAt` (optional), `finishedAt` (optional).
- `createdAt` is **required** and is a client-supplied ISO-8601 datetime, per
  atproto convention. Getting this right now is not optional rigour: a
  required field can never be added to a published lexicon, so this is the
  only window in which it can exist at all. AT Protocol records carry no server timestamp we can
  sort on, so without this field the feed in 0701 has nothing to order by.
  A record is rewritten on every progression update, so `createdAt` means
  "when this entry was added to the list"; `updatedAt` is what the feed
  actually sorts on and is refreshed on every write.
- `note` is singular (one free-text note per entry) — the per-episode
  comment threads described in `docs/architecture/anti-spoiler.md` are a
  post-V1 collection, not a field on this record.
- JSON Schema draft in the phase doc; not yet committed to `lexicons/`.

Scope out: publishing the lexicon file (0104), TS types (0105).

Acceptance criteria: sample record for a film and one for a series both
validate against the schema on paper.

### 0103 — Draft lexicon: generic `progress` object

Depends on: 0102
Goal: one `progress` shape that covers films, series, and can be extended
to games and books without a breaking change.
Scope in:

- Discriminated union on `kind`:
  - `series`: `{ kind: "series", season: number, episode: number }`
  - `film`: `{ kind: "film", seen: boolean }`
  - (documented but not implemented) `game`: `{ kind: "game", percentComplete?: number, hoursPlayed?: number }`
  - (documented but not implemented) `book`: `{ kind: "book", currentPage?: number, totalPages?: number, chapter?: string }`
- Rationale for the discriminant vs a flat schema.

Scope out: the anti-spoiler comparator (Phase 6).

### 0109 — Draft lexicon: episode comment

Depends on: 0102
Goal: a record for one comment attached to one episode, so that discussion is
anchored to the thing it concerns rather than to its author's progression.
Scope in:

- NSID under the experimental namespace, e.g.
  `app.rhizome.experimental.episode.comment`.
- Fields: `subject` ({ source, externalId, season, episode }), `text`,
  `spoiler` (optional boolean — the author pre-flagging their own comment),
  `createdAt` (required, same reasoning as 0102).
- The anchor is the whole point: `(source, externalId, season, episode)` is
  what the AppView indexes on (0604), and what makes the progression gate in
  0702 possible without comparing users to each other.
- Films have no season/episode. Decide and document: either both fields are
  optional and absent for films, or films get `season: 0, episode: 0`. The
  first is cleaner, the second makes the index key uniform — pick one and say
  why.
- Sample records for a series episode and for a film, validating on paper.

Scope out: replies within a thread, editing, rich text, moderation.
Notes: this collection is what makes per-episode threads possible. It was
briefly parked as post-V1 while the anti-spoiler design compared
progressions between users; anchoring discussion to episodes replaced that
comparison entirely, and this record is the anchor.

### 0110 — Draft lexicon: spoiler flag

Depends on: 0109
Goal: a record letting a reader mark someone else's comment as spoilery.
Scope in:

- NSID under the experimental namespace, e.g.
  `app.rhizome.experimental.spoiler.flag`.
- Fields: `subject` ({ uri, cid } — a strong reference to the flagged
  comment), `createdAt` (required).
- It has to be a separate record in the **flagger's own** repo, because there
  is no way to add a field to a record you do not own. That constraint is why
  flag counts need the AppView: knowing how many people flagged a comment
  means aggregating records scattered across repos.
- `cid` alongside `uri` pins the flag to the exact version of the comment
  that was flagged, so editing a comment does not silently inherit flags
  earned by different text.

Scope out: unflagging, weighting by reputation, any moderation semantics.

### 0104 — Publish lexicon JSON files

Depends on: 0102, 0103, 0109, 0110
Goal: the lexicons live at a stable path in the repo.
Scope in:

- `lexicons/app/rhizome/experimental/media/entry.json` etc., following
  atproto conventions. The path mirrors the NSID, so the experimental
  namespace from 0102 is visible in the tree rather than buried in a field.
- `lexicons/README.md` explaining the layout **and the promotion rule**:
  while the namespace is `experimental`, the schema may change freely and
  test records are disposable. Promoting to `app.rhizome.media.*` is a
  one-way door — from that point the evolution rules in 0101 apply, and only
  optional fields can ever be added.
- A short checklist for what must be settled _before_ promoting: every
  required field present, every enum's values final, and the `progress`
  union able to absorb games and books (0103).

Scope out:

- hosting them at a resolvable URL.
- the promotion itself. It gets its own ticket once the shape has survived
  being built on — deliberately not scheduled here, because the whole point
  is that the date is chosen from evidence rather than from the plan.

### 0105 — Generate TypeScript types from lexicon

Depends on: 0104
Goal: strict TS types derived from the lexicon, not hand-written.
Scope in:

- Use `@atproto/lex-cli` (or equivalent) to generate types into
  `src/core/lexicon/generated/`. These artifacts are plain types and
  validators with no browser dependency, and 0108's record wrapper lives in
  `core/` — generating them under `lib/` would make the core depend on the
  disposable web layer (see 0002, 0005).
- Script in `package.json`: `npm run lexicons:generate`.
- Generated files committed; regeneration is idempotent.
- The generated directory is exempt from formatting/lint noise but **not**
  from the core boundary rules — if the generator emits a browser global,
  that is a problem to solve now, not to whitelist.

Scope out: runtime validation (uses the generated validators).

### 0106 — OAuth login (browser)

Depends on: 0001, 0004, 0005
Goal: user logs in with their handle through AT Protocol OAuth and sees their
DID — no password, of any kind, ever typed into Rhizome.
Scope in:

- `@atproto/oauth-client-browser` wired up in `src/lib/atproto/oauth/`.
  This is deliberately in the **browser layer**, not in `core/`: the flow is
  a redirect plus `WebCrypto` DPoP keys plus `IndexedDB`, none of which
  survives a React Native port. A native front end reimplements this file
  and nothing else.
- Client metadata JSON served at a stable HTTPS path from the deployed site
  (`/oauth/client-metadata.json`), with `client_id` equal to its own URL,
  the redirect URI, and the `atproto transition:generic` scope.
  `http://localhost` dev client for local work.
- Login form takes a **handle only** and starts the authorize redirect.
- Callback route completes the flow and puts the resulting session in Zustand.
- `core/` never sees the OAuth client. It is handed an already-authenticated
  agent (or a narrow `AtprotoSession` interface exposing `did` + a fetch
  handler) — the same injection shape as the storage adapter in 0009.

Scope out:

- App passwords. They were the earlier plan and are dropped: the whole
  web-first rationale in `roadmap.md` is that browser OAuth is the cheap
  path, and shipping a "paste your app password here" form contradicts the
  one decision this phase exists to establish.
- Native / deep-link OAuth (that is the port, not V1).
- Multi-account switching (post-V1).

Acceptance criteria:

- logging in never asks for a password on a Rhizome-served page; the
  credential prompt is on the user's own PDS.
- after the callback, the app shows the user's handle and DID.
- nothing under `src/core/` imports `@atproto/oauth-client-browser`.

### 0107 — Session persistence & refresh

Depends on: 0106, 0009
Goal: the user isn't logged out on refresh; expired tokens refresh silently.
Scope in:

- Let the OAuth client own token storage and refresh — it already persists
  its session and rotates DPoP-bound tokens; do not hand-roll either.
- On app boot: `client.init()` restores the session (or resolves to none) and
  the result is pushed into the Zustand auth slice.
- Anything Rhizome persists _itself_ (last active DID, UI prefs) goes through
  the `Storage` adapter from 0009, never `localStorage` directly.
- Logout revokes the session through the client and clears the auth slice.

Scope out: multi-account switching (post-V1).

### 0108 — Client wrapper for record CRUD

Depends on: 0105, 0107
Goal: a small typed wrapper hiding raw `com.atproto.repo.*` calls behind
domain-flavored functions.
Scope in:

- Lives in `src/core/atproto/`, and takes the session as a parameter — it
  constructs no OAuth client and reads no env var, so it stays importable
  from a native front end.
- `createMediaEntry`, `updateMediaEntry`, `deleteMediaEntry`, `listMediaEntries`, `getMediaEntry`.
- Writes set `createdAt` on create and `updatedAt` on every write (0102).
- All input/output typed with the generated lexicon types.
- Errors normalized to a small `AtprotoError` type.

Scope out: caching, optimistic updates (feature layer).
