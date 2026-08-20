# Phase 3 — Personal list

The first end-to-end user loop: find a media, add it to my list, see it,
change its status. Everything reads/writes from the user's own PDS.

---

### 0301 — Add to list from search

Depends on: 0108, 0205
Goal: user searches, picks a result, and it becomes a media record in their PDS.
Scope in:

- "Add" button on a search result row.
- Creates a record with `status = "toWatch"`, `progress` initialized per media type (film: `seen: false`; series: `season: 0, episode: 0`).
- Optimistic UI + toast on success/failure.
- Prevents duplicate add for the same `externalRef`.

### 0302 — View my list (grid)

Depends on: 0108, 0207
Goal: a grid of the current user's media, most recent first.
Scope in:

- Pull all `media.entry` records from the user's repo (paginated if needed).
- Render as a poster grid.
- Empty state ("Nothing here yet — search to add").

### 0303 — Change status

Depends on: 0301
Goal: user can move an entry between toWatch / watching / done / dropped.
Scope in:

- Status control on each card and on the detail page.
- Updates the record in place.
- Optional side-effects (e.g. moving to `done` sets `finishedAt`) — spec them here.

### 0304 — Remove from list

Depends on: 0301
Goal: delete a record.
Scope in:

- Delete action with a confirmation.
- List refreshes.
  Scope out: soft-delete / undo (post-V1).

### 0305 — Free-text personal note

Depends on: 0301
Goal: user can write and edit a note on an entry.
Scope in:

- Textarea on the detail page, writing the `note` field from 0102.
- A "this note contains spoilers" checkbox writing the `spoiler` flag. It is
  the only spoiler signal the feed engine (0604) gets that the progression
  comparison cannot infer, so it ships with the note, not later.
- Autosave on blur or a Save button (decide during implementation).
- Reasonable length cap enforced.

### 0306 — User rating

Depends on: 0301
Goal: a numeric rating on each entry.
Scope in:

- Scale chosen (5-star / 10-point / 100-point) — pick one, document rationale.
- Editable from the detail page.
- Displayed on the card.

### 0307 — Start / end dates

Depends on: 0303
Goal: track when the user started and finished a media.
Scope in:

- Auto-set `startedAt` on first move to `watching`.
- Auto-set `finishedAt` on move to `done`.
- Manual override on the detail page.
