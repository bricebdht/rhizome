# Phase 7 — Social feed, episode threads, anti-spoiler

The defining feature of Rhizome, and the reason for everything before it.

The anti-spoiler model is deliberately simple, and worth stating in one
sentence before the tickets: **you reach an episode's discussion once you
have marked that episode as seen, and anything spoilery inside it can be
flagged by readers so it renders blurred until clicked.**

No progression comparison between users, no per-field decisions. The gate is
a boolean about your own data; the flag handles what the gate cannot — a
comment inside the S03E05 thread that talks about S03E09.

One honesty note that belongs in every ticket here: **this is a courtesy
layer, not access control.** Comments are public records, readable straight
from repos by anyone bypassing our UI entirely. It protects people who want
protecting; it stops nobody determined.

---

### 0701 — Feed of recent entries from followed accounts

Depends on: 0108
Goal: given the logged-in user, a chronologically merged list of recent media
entries from the accounts they follow.
Scope in:

- Read the follow list via `app.bsky.graph.getFollows`.
- For each follow, fetch recent media entry records, paginated and capped.
- Merge and sort by `updatedAt` desc, falling back to `createdAt` when a
  record has never been updated (both defined in 0102).
- Client-supplied timestamps are not trustworthy — any user can write any
  value to their own repo. Clamp future dates to "now" for ordering rather
  than letting one record pin itself to the top forever.
- Cache in memory for the session.
- **Be a good citizen, and survive being one.** This is fan-out-on-read: the
  cost is one request per followed account, paid by the reader's browser, and
  it degrades with _how many accounts you follow_ rather than with how
  popular anyone is. Concretely:
  - cap the number of repos queried per load instead of sweeping every
    follow;
  - cap page size per repo;
  - most followed accounts share one host (`bsky.social`), so a naive
    fan-out is a burst of hundreds of requests from one IP to one host —
    expect `429` and back off exponentially rather than retrying in a loop;
  - document the follow-count ceiling at which this stops being pleasant.
    That number is the trigger for indexing media entries in the AppView
    (0602), which is an implementation change the lexicon never sees.

Scope out: real-time updates; routing this through the AppView (0602).

### 0702 — Episode thread, gated by your own progression

Depends on: 0109, 0605, 0402
Goal: the discussion page for one episode, reachable only once the viewer has
marked that episode as seen.
Scope in:

- `hasReached(viewerProgress, target)` — a pure function in
  `src/core/progress/`, unit tested. Given the viewer's progression on a
  series and a target season/episode, is the viewer at or past it? Films
  reduce to `seen === true`.
- Thread page fetches from the AppView's `/thread` endpoint (0605).
- Unreached episodes do not render a blurred thread — the entry point itself
  is absent, replaced by "mark this episode as seen to join the
  discussion". Blurring an entire thread would advertise that there is
  something to see, and the count alone leaks interest.
- Fail closed: no progression record for that series, or an unrecognized
  `progress.kind`, means not reached.

Notes: the gate is a UI affordance over public data. Say it in
`docs/architecture/anti-spoiler.md` so nobody later mistakes it for a
permission.

### 0703 — Post a comment on an episode

Depends on: 0109, 0702
Goal: the viewer can write in a thread they have access to.
Scope in:

- Writes an episode comment record straight to the user's own PDS — never
  through the AppView, which learns about it from the firehose like everyone
  else.
- Anchored to `(source, externalId, season, episode)`.
- Optimistic insert into the thread view, since the AppView takes a moment to
  see the commit. Reconcile on the next fetch.
- Length cap, and the author's own "contains spoilers" checkbox, which
  pre-flags the comment without needing anyone else to.

Scope out: replies/threading within a thread, editing, rich text.

### 0704 — Flag a comment as a spoiler

Depends on: 0110, 0703
Goal: readers can mark a comment as spoilery, so it renders hidden for
others.
Scope in:

- Writes a spoiler-flag record to the **flagger's own** repo, referencing the
  target comment's AT-URI. This is the only shape available: you cannot add a
  field to a record you do not own.
- Flag counts come from the AppView (0605); one flag per account is counted.
- Flagging is not moderation and not deletion. A flagged comment stays
  readable behind one click, by design.

Scope out: unflagging by others, reputation weighting, abuse handling —
worth a ticket once there is any usage to reason about.

### 0705 — Blur and reveal

Depends on: 0704
Goal: flagged comments render hidden and open on an explicit action.
Scope in:

- A comment is hidden when the author flagged it (0703) or when its flag
  count crosses a threshold. Pick the threshold and write down the reasoning
  — with no usage data yet, 1 is the defensible starting point, biased
  towards over-hiding.
- Click to reveal, per comment, session-scoped and not persisted.
- The affordance must not leak what it hides: "Spoiler — reveal", never
  "Spoiler about S03E09".

### 0706 — Anti-spoiler architecture note

Depends on: 0702, 0705
Goal: the model written down where it can be argued with.
Scope in:

- `docs/architecture/anti-spoiler.md`: the two mechanisms (progression gate,
  reader flags), why there is no cross-user progression comparison, and the
  TV Time model it borrows from — people declare what they have seen, and
  discussion is anchored to the episode it concerns, so _where_ a comment
  lives already carries most of the spoiler information.
- State the limits plainly: public records, courtesy not enforcement, and
  the fact that a determined reader bypasses all of it.
- Record what was considered and dropped, so it is not re-proposed: an
  earlier design compared the reader's progression to the poster's on every
  feed entry and made a per-field show/hide decision. Anchoring discussion to
  episodes made the comparison unnecessary — the anchor already carries the
  information the comparison was reconstructing.
