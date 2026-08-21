# Phase 8 — Polish & launch

Only meaningful once Phases 1-7 produce something worth showing. Keep the
launch honest: an early WIP framed as "here's the technical journey", not a
product pitch.

---

### 0801 — Final README

Depends on: 0705
Goal: someone landing on the repo can understand, install, and try Rhizome.
Scope in:

- Screenshots (list, detail, feed with spoiler blur).
- One-paragraph pitch.
- Architecture diagram (link to `docs/architecture/`).
- Install & run locally (proxy + frontend).
- Roadmap link.
- Attribution (TMDB, Bluesky).

### 0802 — CONTRIBUTING.md

Depends on: 0801
Goal: lower the friction for outside contributors.
Scope in:

- How to pick a ticket: open issues in the current milestone (link to `docs/plan/README.md` for the spec/issue split).
- Commit message convention.
- PR expectations (small, scoped, one ticket per PR).
- Code of conduct link.

### 0803 — GitHub topics + description

Depends on: 0801
Goal: the repo is discoverable and its purpose is legible at a glance.
Scope in:

- Repo description one-liner.
- Topics: `atproto`, `bluesky`, `decentralized`, `react`, `typescript`, `media-tracker`.
- Social preview image (optional).

### 0804 — Draft launch thread for Bluesky

Depends on: 0801
Goal: a thread ready to post when we ship.
Scope in:

- 4-6 posts: what it is, why now (TV Time context), how AT Protocol is used, current status, call for feedback.
- Screenshots attached.
- Stored in `docs/launch/bluesky-thread.md` (draft, not posted from the repo).

### 0805 — Issue templates

Depends on: —
Goal: incoming issues are structured.
Scope in:

- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/question.yml`
- Config disables blank issues.
