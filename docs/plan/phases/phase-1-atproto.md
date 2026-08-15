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
- Sequence diagram (ASCII) of: login → write a media record → read another user's records.
- File: `docs/architecture/atproto.md`.
Scope out: any code.

### 0102 — Draft lexicon: media entry (film / series)
Depends on: 0101
Goal: a lexicon definition for one media entry in a user's list, scoped to
films and series but shaped to accept games/books later without a breaking
change.
Scope in:
- NSID chosen (e.g. `app.rhizome.media.entry`) with rationale.
- Fields: `mediaType` (film|series), `externalRef` ({ source: "tmdb", id: string }), `status` (toWatch|watching|done|dropped), `progress` (see 0103), `rating` (optional number), `notes` (optional string), `startedAt`, `finishedAt`.
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
- Use `@atproto/lex-cli` (or equivalent) to generate types into `src/lib/atproto/lexicons/`.
- Script in `package.json`: `npm run lexicons:generate`.
- Generated files committed; regeneration is idempotent.
Scope out: runtime validation (uses the generated validators).

### 0106 — Auth flow with Bluesky
Depends on: 0001, 0004
Goal: user can log in with a handle + app password and see their DID.
Scope in:
- Login form (handle + app password).
- Uses `@atproto/api` `AtpAgent`.
- On success: store session in Zustand.
- Explicit warning: "use an app password, never your main password".
Scope out: OAuth (atproto OAuth isn't fully stable for third-party clients yet — revisit).
Acceptance criteria: after logging in, the app shows the user's handle and DID somewhere.

### 0107 — Session persistence & refresh
Depends on: 0106
Goal: the user isn't logged out on refresh; expired tokens refresh silently.
Scope in:
- Persist session to `localStorage` under a namespaced key.
- Re-hydrate on app boot.
- Hook into `AtpAgent`'s `persistSession` callback.
- Clear session on logout.
Scope out: multi-account switching (post-V1).

### 0108 — Client wrapper for record CRUD
Depends on: 0105, 0107
Goal: a small typed wrapper hiding raw `com.atproto.repo.*` calls behind
domain-flavored functions.
Scope in:
- `createMediaEntry`, `updateMediaEntry`, `deleteMediaEntry`, `listMediaEntries`, `getMediaEntry`.
- All input/output typed with the generated lexicon types.
- Errors normalized to a small `AtprotoError` type.
Scope out: caching, optimistic updates (feature layer).
