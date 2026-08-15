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
- Merge and sort by `createdAt` desc.
- Cache results in memory for the session.
Scope out: real-time updates (post-V1).

### 0604 — Anti-spoiler rule engine
Depends on: 0103, 0405
Goal: a pure function that, given the viewer's progression and the poster's progression on the same media, decides whether the poster's activity is a spoiler.
Scope in:
- `isSpoiler(viewerProgress, posterProgress, mediaType)`:
  - film: no spoiler concept beyond "seen / not seen" — the poster having seen it is not itself a spoiler unless the entry includes a note; treat notes as spoilerable.
  - series: spoiler if poster is ahead of viewer (later season, or same season and later episode).
  - unknown media type: default to "spoiler" (fail closed).
- Unit-test-worthy pure function, colocated with the progression component.
- Documented in `docs/architecture/anti-spoiler.md`.

### 0605 — Feed UI with blurred spoilers
Depends on: 0603, 0604
Goal: render the feed with spoiler content blurred/hidden by default.
Scope in:
- Feed page listing recent entries from follows.
- For each entry, resolve the viewer's own progression on the same media (from their own list).
- If `isSpoiler`, hide the title's progression details and blur any notes; otherwise show normally.
- Clear visual affordance that content is hidden ("Spoiler for S03E05 — reveal").

### 0606 — Reveal spoiler action
Depends on: 0605
Goal: user can explicitly reveal a hidden item.
Scope in:
- Click-to-reveal on individual items.
- Session-scoped: reveals are not persisted across reloads (post-V1).
