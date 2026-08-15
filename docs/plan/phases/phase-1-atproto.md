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
- File: `docs/architecture/atproto.md`.
Scope out: any code.

### 0102 — Draft lexicon: media entry (film / series)
Depends on: 0101
Goal: a lexicon definition for one media entry in a user's list, scoped to
films and series but shaped to accept games/books later without a breaking
change.
Scope in:
- NSID chosen (e.g. `app.rhizome.media.entry`) with rationale.
- Fields: `mediaType` (film|series), `externalRef` ({ source: "tmdb", id: string }), `status` (toWatch|watching|done|dropped), `progress` (see 0103), `rating` (optional number), `note` (optional string), `spoiler` (optional boolean — the author flagging their own note, see 0604), `createdAt`, `updatedAt` (optional), `startedAt` (optional), `finishedAt` (optional).
- `createdAt` is **required** and is a client-supplied ISO-8601 datetime, per
  atproto convention. AT Protocol records carry no server timestamp we can
  sort on, so without this field the feed in 0603 has nothing to order by.
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

### 0104 — Publish lexicon JSON files
Depends on: 0102, 0103
Goal: the lexicon lives at a stable path in the repo.
Scope in:
- `lexicons/app/rhizome/media/entry.json` etc., following atproto conventions.
- `lexicons/README.md` explaining the layout.
Scope out: hosting them at a resolvable URL.

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
- Anything Rhizome persists *itself* (last active DID, UI prefs) goes through
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
