# Phase 6 — AppView (episode thread index)

A small always-on service that subscribes to the atproto firehose, indexes
Rhizome's comment and spoiler-flag records network-wide, and serves them back
as episode threads.

This is the one piece of infrastructure V1 owns, and it exists for a reason
nothing else can satisfy: showing every comment on S03E05 requires records
scattered across thousands of repos, and no query can ask "who wrote about
this episode?". Only an index can answer that.

**It is an index, never a source of truth.** Writes go straight from the
client to the user's PDS; the AppView only ever reads. If it is destroyed,
no user data is lost — the index is rebuilt by replaying the firehose. Every
ticket here is written to keep that property true.

---

### 0601 — Design note: aggregation strategy

Depends on: 0108
Goal: written comparison of the ways to aggregate, and the record of which
one V1 uses for which data.
Scope in:

- Option A — **pull from follows, client-side**: for each followed account,
  call `listRecords` on their repo. No infrastructure; cost is one request
  per followed account, paid by the reader's browser.
- Option B — **AppView**: an always-on service consumes the firehose,
  indexes records, exposes a read API. Infrastructure and operations, but it
  is the only option that can answer network-wide questions.
- Option C — **the index as records in a repo we own**: instead of a private
  database plus a read API, write one small reference record per indexed
  comment into our own repo, and let the client read it with plain
  `listRecords`. References, never copies — the comments themselves stay in
  their authors' repos.
  This works, and the mechanism should be recorded because it is not
  obvious: `listRecords` with `reverse=true` returns records in ascending
  `rkey` order and accepts an arbitrary prefix as `cursor`, so encoding the
  anchor `(source, externalId, season, episode)` into the `rkey` turns
  "fetch this episode's comments" into a prefix range scan, with
  pagination-on-scroll falling out of the cursor for free.
  _Verified 2026-08-22 against `bsky.social`: `cursor=3jz` returned
  `3jzaiuyoykf2r, 3jzaiwxn7oy2n, 3jzaj2f4mz32x` in order._
  - **What it buys**: no read API and no database of ours to operate
    (0604-0605 disappear), and the index becomes public and reusable by any
    other client.
  - **What it does not buy**: the always-on process. Something must still
    consume the firehose to write those references — 0603 is unchanged, and
    that is the harder two-thirds.
  - **What it costs**: every reference is a signed commit, so we would emit
    firehose traffic proportional to network activity and grow a repo that
    never shrinks — and repos are Merkle trees, where multi-million-record
    sizes are a known pain. Flag counting moves to the client (read every
    reference and tally) where SQLite does it with a `GROUP BY`. And our repo
    is just as much a single point of failure as a database would be.
  - **What would flip the decision**: wanting the index to be readable by
    clients other than ours. At that point Option C is clearly better, and
    switching is a rewrite of this service rather than a data migration —
    the lexicon never sees the difference, because comments and flags live in
    their authors' repos under all three options.
- Rejected outright, and worth recording so it is not re-proposed: **running
  a PDS of our own that holds the comments**. Records are signed by the DID
  owning the repo, so comments in our repo would be signed by us — authorship
  becomes a field we assert rather than a cryptographic fact. Users cannot
  write to a repo they do not own, so it would also need a write API in
  front, making it authoritative: deleting it would lose data. And operating a
  PDS is strictly more work than operating an index.
- The comparison must be per data type rather than global — that is the
  actual shape of the decision:
  - **media entries** (`app.rhizome.*.media.entry`) → A. The reader only
    ever needs the accounts they follow, and direct reads keep working when
    the AppView is down.
  - **episode comments and spoiler flags** → B. A thread limited to people
    you follow is not a thread; it is empty for a new user, and the value of
    episode discussion is precisely that strangers are in it.
- File: `docs/architecture/feed-aggregation.md`.

Scope out: implementing either (0603-0606).

### 0602 — Decision: what the AppView indexes, and what it must never become

Depends on: 0601
Goal: bound the service before writing it, since an index that grows into a
backend would quietly undo the whole architecture.
Scope in:

- Decision recorded at the top of `docs/architecture/feed-aggregation.md`,
  including **which shape** the index takes — private database plus read API
  (B), or reference records in a repo (C). Default expectation is B for V1
  because it is the smaller thing to operate and flag counting stays a
  `GROUP BY`; C is the better answer the day other clients should be able to
  read the index, and 0601 records what would flip it.
- **Indexed in V1**: episode comments, spoiler flags. Nothing else.
- **Explicitly not indexed in V1**: media entries. The follows feed keeps
  reading repos directly (0701) so that an AppView outage cannot take the
  user's own list, their progression, or their feed down with it. Indexing
  them later is an implementation change invisible to the lexicon — the exit
  is open, it is just not taken yet.
- **Never**: the AppView does not accept writes, does not hold anything that
  is not derivable from the firehose, and is never the authority for
  anything. State the test plainly — _if we wiped it, would any user lose
  data?_ The answer must stay "no".
- Record the cost honestly: an always-on process plus a small database is a
  few euros a month, not zero. The roadmap's old "cost close to zero" line
  is updated in the same PR.

### 0603 — Jetstream consumer

Depends on: 0602, 0110
Goal: a process that stays connected to the firehose and turns matching
commits into rows.
Scope in:

- Subscribe to **Jetstream** (`wss://jetstream.us-west.bsky.network`) rather
  than the raw relay: it is public, needs no authentication, delivers plain
  JSON instead of CBOR/CAR, and filters server-side by collection. That
  choice is what keeps this service small enough to write in TypeScript
  alongside the rest.
- `wantedCollections` limited to our comment and flag NSIDs, so we receive
  our own traffic and not the network's.
- Handle `commit` events for create, update **and delete** — a deleted
  comment must leave the index.
- **Persist the cursor** on every batch. Reconnect with it after a drop so
  the gap is replayed rather than skipped; Jetstream's lookback window is
  bounded, so a long outage needs the backfill path in 0606.
- Reconnect with exponential backoff, and log the size of any gap.

Scope out: indexing media entries (0602), moderation, spam handling.

### 0604 — Index storage

Depends on: 0603
Goal: somewhere to put the records, shaped for the one query that matters.
Scope in:

- SQLite on a persistent volume. The dataset is comments and flags; anything
  heavier is premature.
- Comments keyed for lookup by `(source, externalId, season, episode)` —
  the anchor defined in 0109 — ordered by `createdAt`.
- Flags stored as their own rows referencing a comment's AT-URI, counted per
  comment. A flag from an account is counted once.
- Store the AT-URI, CID and author DID of every row, so anything served can
  be traced back to the record it came from and re-verified against the
  source repo.
- Schema migrations are ordinary here: this database is ours and derivable,
  so it can be dropped and rebuilt. Say so in the README next to it, or
  someone will treat it as precious.

### 0605 — Read API

Depends on: 0604
Goal: the endpoints the client needs, and nothing more.
Scope in:

- `GET /thread?source=…&id=…&season=…&episode=…` — comments for one
  episode, paginated, each with its flag count.
- `GET /flags?uris=…` — flag counts for a set of comment URIs.
- CORS allowlist, and rate limiting per IP.
- Cache headers: threads are cheap to regenerate and stale-by-seconds is
  fine.

Scope out: any write endpoint. Comments and flags are written by the client
straight to the user's PDS; the AppView learns about them from the firehose
like everyone else. This is not a limitation to work around — it is the
property that keeps the service an index.

### 0606 — Deployment and operations

Depends on: 0605
Goal: it stays up, and when it does not, we know.
Scope in:

- Host chosen with rationale (Fly.io / Railway / small VPS). It must support
  a long-lived websocket and a persistent volume, which rules out the
  serverless model used for the TMDB proxy.
- Health endpoint exposing cursor lag, so "connected but silently behind" is
  visible.
- **Backfill path** for an outage longer than Jetstream's lookback window:
  re-read repos directly for known authors, or accept the gap explicitly.
  Decide which, and write it down — this is the failure mode most likely to
  be discovered at the worst moment.
- Basic alerting on process death and on lag beyond a threshold.

### 0607 — Client degradation contract

Depends on: 0605
Goal: an AppView outage degrades one feature instead of the app.
Scope in:

- The client treats the AppView as optional: a failed call disables episode
  threads and nothing else. The list, progression, personal data and the
  follows feed all keep working because none of them route through it.
- A plain message in the thread UI when it is unreachable — not a spinner
  that never resolves, and not an error page.
- An acceptance test that runs the app with the AppView unreachable and
  checks every other surface still functions.

Notes: this ticket is the one that keeps the decentralization claim honest.
If the app becomes unusable without our server, we have rebuilt a
centralized product with extra steps.
