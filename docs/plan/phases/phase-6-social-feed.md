# Phase 6 — Social feed with anti-spoiler logic

The defining feature of Rhizome. Aggregate other users' media records and
present them in a feed that hides spoilers based on where the viewer is in
that same media.

---

### 0601 — Design note: aggregation strategy

Depends on: 0108
Goal: written comparison of the two viable approaches for V1.
Scope in:

- Option A — pull from follows client-side: for each account the user follows on Bluesky, call `listRecords` on `app.rhizome.media.entry`. Simple, no infra, latency proportional to follow count.
- Option B — custom AppView / firehose consumer: a small backend subscribes to the relay, indexes Rhizome records, exposes a feed API. More infra, better scaling.
- File: `docs/architecture/feed-aggregation.md`.
  Scope out: implementing either option (0602 decides, 0603 builds).

### 0602 — Decision: V1 aggregation strategy

Depends on: 0601
Goal: pick A or B for V1 and log the reasoning.
Scope in:

- Decision recorded at the top of `docs/architecture/feed-aggregation.md`.
- If A: document the follow-count ceiling at which it stops being viable.
- If B: define the smallest possible service and defer to phase 2.
- Default expectation: **A for V1** (matches "cost close to zero" goal), B parked as follow-up.

### 0603 — Fetch recent media records from followed accounts

Depends on: 0602
Goal: given the logged-in user, return a chronologically merged list of recent media entries from accounts they follow on Bluesky.
Scope in:

- Read the user's follow list (via `app.bsky.graph.getFollows`).
- For each follow, fetch recent `app.rhizome.media.entry` records (paginated, capped).
- Merge and sort by `updatedAt` desc, falling back to `createdAt` when a
  record has never been updated. Both fields are defined in 0102 — AT
  Protocol gives records no server-side timestamp, so if that lexicon change
  does not land, this ticket has nothing to order by.
- Client-supplied timestamps are not trustworthy (any user can write any
  value to their own repo). Clamp anything in the future to "now" for
  ordering purposes rather than letting one record pin itself to the top.
- Cache results in memory for the session.
  Scope out: real-time updates (post-V1).

### 0604 — Anti-spoiler rule engine

Depends on: 0102, 0103, 0405
Goal: a pure function that, given the viewer's progression and a feed entry,
decides what of that entry is safe to show.
Scope in:

- `isSpoiler(viewerProgress, entry)` where `entry` is the poster's media
  entry — `{ mediaType, progress, note?, spoiler? }`. Passing the whole
  entry rather than two bare progress values is the point: the same
  "watched S03E05" is harmless on its own and unsafe with a note attached,
  and a function that only sees progressions cannot tell those apart
  (it would have to hide every entry, or leak every note).
- Returns a decision, not a boolean:
  `{ progress: "show" | "hide", note: "show" | "hide" | "absent" }`.
  The UI needs the two separately — 0605 blurs a note while still showing
  that someone watched _something_.
- Rules:
  - `spoiler === true` (author flagged their own note) → note hidden,
    whatever the progressions say. Cheapest signal available and the author
    is the one who knows.
  - series — poster ahead of viewer (later season, or same season and later
    episode) → hide both. Poster level with or behind the viewer → show
    both: the viewer has already seen everything the entry can reveal.
  - film — `seen: true` is not itself a spoiler, so progress always shows.
    A note is hidden unless the viewer has also seen the film.
  - viewer has **no entry** for that media → treat as zero progression
    (series: S00E00; film: not seen).
  - unknown media type or unrecognized `progress.kind` → hide both
    (fail closed).
- Pure and dependency-free, in `src/core/progress/` — it is the piece of
  Rhizome most worth keeping across front ends. Unit tests cover each rule,
  including the "viewer has no entry" and fail-closed paths.
- Documented in `docs/architecture/anti-spoiler.md`, including the model this
  borrows from TV Time: users declare what they have seen, and discussion is
  anchored to the episode it concerns, so _where_ a comment lives already
  carries most of the spoiler information. Note there what V1 does not have
  yet, and why:
  - **Per-episode comment threads.** In V1 a note hangs off the media entry,
    so its anchor is the poster's progression, not a specific episode. Real
    threads need their own lexicon collection keyed by
    `(externalRef, season, episode)` — a Phase-2 item, and the natural home
    for the anchoring rule above.
  - **Readers flagging someone else's note as a spoiler.** Community
    labelling cannot be a field on a record you do not own; it needs
    separate label records plus aggregation across repos, which is the same
    infrastructure as the custom AppView parked in 0602. V1 ships the
    author-side `spoiler` flag only, and the engine is written so that a
    reader-supplied flag drops into the same decision later.

### 0605 — Feed UI with blurred spoilers

Depends on: 0603, 0604
Goal: render the feed with spoiler content blurred/hidden by default.
Scope in:

- Feed page listing recent entries from follows.
- For each entry, resolve the viewer's own progression on the same media (from their own list).
- Apply the decision from 0604 field by field: hidden progression collapses
  to the media title alone, a hidden note is blurred in place.
- Clear visual affordance that content is hidden ("Spoiler — reveal"), and
  the label itself must not leak what it hides: never render
  "Spoiler for S03E05" to a viewer who is on S02.

### 0606 — Reveal spoiler action

Depends on: 0605
Goal: user can explicitly reveal a hidden item.
Scope in:

- Click-to-reveal on individual items.
- Session-scoped: reveals are not persisted across reloads (post-V1).
