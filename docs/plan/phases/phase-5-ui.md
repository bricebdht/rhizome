# Phase 5 — UI

Until now the UI has been the minimum needed to test each feature. This
phase makes it pleasant to use.

---

### 0501 — App shell

Depends on: 0003, 0106
Goal: consistent layout across pages, with auth state visible.
Scope in:

- Top nav: logo, primary links (My List, Search, Feed), account menu.
- Handles logged-out state (redirect / prompt to log in).
- Route structure decided (`react-router` added here if not before).

### 0502 — Grid view with posters

Depends on: 0302
Goal: replace the placeholder grid from Phase 3 with a designed one.
Scope in:

- Responsive columns (auto-fit).
- Skeleton loaders.
- Filter chips (status, media type) — client-side.
- Sort options (recently added, title, rating).

### 0503 — Media detail page

Depends on: 0204, 0405
Goal: one page per media in the user's list, showing everything they can do with it.
Scope in:

- Hero backdrop, poster, overview.
- Progression component (0405) and its controls.
- Status, rating, dates, notes.
- Season/episode picker (0402) for series.

### 0504 — Search UI

Depends on: 0203, 0205
Goal: dedicated search page.
Scope in:

- Debounced query input.
- Result list with poster + title + year + type badge.
- "Add to list" affordance per result (feature from 0301).

### 0505 — Empty / loading / error states

Depends on: 0502, 0504
Goal: no blank screens, no unhandled promise rejections in the UI.
Scope in:

- Reusable `EmptyState`, `LoadingState`, `ErrorState` components.
- Applied to every list/query in the app.

### 0506 — Responsive / mobile pass

Depends on: 0501, 0502, 0503, 0504
Goal: the app is usable on a phone.
Scope in:

- Mobile nav (hamburger or bottom bar — decide).
- Grid, detail page, search all validated on <=375px width.

### 0507 — Light / dark theme

Depends on: 0501
Goal: theme toggle, respects system preference by default.
Scope in:

- CSS variables driven by shadcn's theming.
- Toggle in the account menu.
- Persisted in `localStorage`.
