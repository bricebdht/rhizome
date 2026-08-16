# Phase 4 — Progression tracking

Turn the list into a real tracker. The generic `progress` shape defined in
Phase 1 is instantiated here for films and series.

---

### 0401 — Series: increment season / episode
Depends on: 0302, 0204
Goal: one-click "I watched the next episode" advancing the record.
Scope in:
- Button on series card and detail page.
- Advances episode by 1; if it exceeds the season's episode count (from TMDB), roll over to next season.
- Handles the "no more episodes" case (auto-set status to `done`? — decide and document).

### 0402 — Manual season / episode picker
Depends on: 0401
Goal: user can jump to any specific season/episode.
Scope in:
- Season and episode select controls, populated from TMDB.
- Writes progression atomically.

### 0403 — Series: "next up" computation
Depends on: 0401, 0204
Goal: given a record, know what to watch next (title, air date, still image).
Scope in:
- Helper `getNextUp(record, tmdbSeasonsData)` returning the next episode metadata or `null`.
- Displayed on the card and detail page.

### 0404 — Films: mark as seen
Depends on: 0301
Goal: films have no partial progression; a single toggle sets `seen: true` and status to `done`.
Scope in:
- Toggle on film card and detail page.
- On mark-seen: sets `finishedAt` if not already set.

### 0405 — Generic progression component
Depends on: 0401, 0404
Goal: one component that renders "current progress" for any media type,
so adding games/books later is a matter of adding a case, not a UI rewrite.
Scope in:
- Component takes a `progress` object and renders the appropriate representation.
- `series` → "S03E07"; `film` → "Seen" / "Not seen".
- Unknown kinds render a placeholder without crashing.
