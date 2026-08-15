# Phase 0 — Bootstrap

Get to a project that lints, typechecks, builds, and runs locally with a
placeholder screen. No feature work in this phase.

---

### 0001 — Scaffold Vite + React + TypeScript app
Depends on: —
Goal: create a working Vite + React + TS project at the repo root.
Scope in:
- `npm create vite@latest` with the `react-ts` template, cleaned up.
- `package.json` scripts: `dev`, `build`, `preview`.
- App renders a placeholder page.
Scope out: any styling framework, any state library, any router.
Acceptance criteria:
- `npm install && npm run dev` starts the app on localhost.
- `npm run build` succeeds.
Notes: keep the default Vite template files trimmed to the minimum.

### 0002 — Configure ESLint, Prettier, strict TS
Depends on: 0001
Goal: enforce a consistent code style and strict typing from day one.
Scope in:
- ESLint config (typescript-eslint recommended + react + hooks).
- Prettier config; ESLint and Prettier don't fight.
- `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- `npm run lint`, `npm run typecheck`, `npm run format` scripts.
- **Layer boundary rules** enforcing that `src/core/` stays platform-agnostic
  (see 0005 for the layout, and the guiding decision in `roadmap.md`).
  All three of the following are needed — the import rules alone do not stop
  a core module from reaching for a browser global:
  - `import/no-restricted-paths` — `src/core/` may not import from `app/`,
    `features/`, `components/`, `state/` **or `lib/`**. The dependency
    direction is one-way: the UI and the platform adapters consume the core,
    never the reverse. `lib/` is in the list because it *is* the browser
    layer: core receives its adapters by injection (see 0009), it never
    imports one.
  - `no-restricted-imports` scoped to `src/core/**` — bans `react`,
    `react-dom`, and the `@/app/*`, `@/components/*`, `@/features/*`,
    `@/state/*`, `@/lib/*` aliases (the alias form bypasses
    `no-restricted-paths`, so both rules are required).
  - `no-restricted-globals` scoped to `src/core/**` — bans `window`,
    `document`, `localStorage`, `sessionStorage`, `navigator`, `location`
    and `alert`. Without this the boundary is decorative.
- **Separate `tsconfig` for the core** — `tsconfig.core.json` extends the
  root config, drops `"DOM"` from `lib`, and covers `src/core/**`. This is
  what makes the guarantee structural rather than a lint rule someone can
  disable inline: a `document` reference stops typechecking, it does not
  merely warn. `npm run typecheck` runs both projects.
Scope out:
- pre-commit hooks (nice-to-have, later).
- enforcing anything about `src/lib/` itself — it is allowed to be as
  browser-specific as it likes. That is its job.
Acceptance criteria:
- all three scripts pass on the scaffolded project.
- each of these, added deliberately inside `src/core/`, fails the checks:
  - `import { useState } from 'react'` → fails `npm run lint`.
  - `import { webStorage } from '@/lib/storage/web'` → fails `npm run lint`.
  - `localStorage.getItem('x')` → fails `npm run lint` **and**
    `npm run typecheck`.

### 0003 — Add Tailwind + shadcn/ui
Depends on: 0001
Goal: baseline styling and component primitives ready to use.
Scope in:
- Tailwind installed and wired to Vite.
- shadcn/ui initialized; `Button` and `Card` added as smoke test.
- Global CSS reset applied.
Scope out: any theming, dark mode toggle (Phase 5).
Acceptance criteria: a demo page shows a shadcn `Button` and `Card` styled correctly.

### 0004 — Zustand store skeleton
Depends on: 0001
Goal: a single place to add stateful slices as features arrive.
Scope in:
- Zustand installed.
- One example slice (e.g. `useUiStore`) to demonstrate the pattern.
- Convention documented in `src/state/README.md` (one slice per file, hook naming).
Scope out: any real state (auth, list, feed) — created with their features.

### 0005 — Folder structure & path aliases
Depends on: 0001
Goal: predictable module layout, no `../../..` imports, and a one-way
dependency boundary around the platform-agnostic core.
Scope in:
- `src/` layout: `app/`, `components/`, `core/`, `features/`, `lib/`,
  `state/`, `types/`.
- `src/core/` is the layer that must survive a future React Native front end:
  `atproto/` (records, agent, DID resolution — *not* the OAuth client),
  `lexicon/` (types + validation), `tmdb/` (client), `progress/`
  (comparison + anti-spoiler engine), `storage/` (interface only, see 0009).
  Rule of thumb: if the code needs to know it runs in a browser, it does not
  belong in `core/`. No `window`, no `document`, no `localStorage`, no React.
- `src/lib/` holds the browser-specific adapters that `core/` consumes
  (storage implementation, OAuth client wiring, the TMDB proxy URL read from
  `import.meta.env`). Nothing under `lib/` is imported by `core/` — it is
  passed in.
- Generated artifacts follow the same rule as hand-written ones: the lexicon
  types and validators are platform-neutral, so they are generated into
  `src/core/lexicon/` (0105), not into `lib/`.
- `@/*` path alias configured in `tsconfig.json` and `vite.config.ts`.
- Short `src/README.md` explaining the layout convention and the core
  boundary — including the test to apply when unsure where a file goes:
  *would this make sense inside a UI-less npm package?*
Scope out:
- creating empty folders for features that don't exist yet.
- extracting `core/` into a real package or monorepo workspace. It is a
  folder plus a lint rule; that is enough for V1.
Notes: the boundary is enforced by the ESLint rules in 0002, not by
convention alone.

### 0006 — Initial README
Depends on: —
Goal: someone landing on the repo understands the intent, stack, and where the plan lives.
Scope in:
- One-paragraph pitch (what & why).
- Stack summary.
- Link to `docs/plan/README.md`.
- "Status: early WIP" banner.
Scope out: screenshots, install instructions, contribution guide (Phase 7).

### 0007 — GitHub Actions CI
Depends on: 0002
Goal: every push and PR runs lint + typecheck + build.
Scope in:
- Single workflow: install → lint → typecheck → build.
- Node LTS, npm cache.
Scope out: tests (no test suite yet), deploy pipeline.
Acceptance criteria: workflow green on `main` after the first push.

### 0008 — Environment variables strategy
Depends on: 0001
Goal: convention for env vars, safe defaults committed.
Scope in:
- `.env.example` listing all required vars with placeholder values.
- Documented in the README: which are public (`VITE_*`) vs proxy-side only.
- `.env` and `.env.local` in `.gitignore` (verify).
Scope out: actually setting real values (proxy phase).

### 0009 — Storage adapter behind an async interface
Depends on: 0005
Goal: keep persistence swappable, so a future native front end does not force
an async refactor across the whole call chain.
Scope in:
- `Storage` interface in `src/core/storage/` — `get`/`set`/`remove`, all
  returning promises **even though the web implementation is synchronous**.
  That is the entire point: `localStorage` is sync, `AsyncStorage` and
  `expo-secure-store` are not.
- Web implementation in `src/lib/storage/web.ts` wrapping `localStorage`.
- Core modules receive a `Storage` — they never import an implementation.
- An in-memory implementation for tests.
Scope out:
- the same treatment for `fetch`, navigation, or anything else. One adapter,
  chosen because its cost of non-decision is asymmetric. Others come when a
  concrete need appears, not before.
- deciding what actually gets persisted (session, cache) — that arrives with
  Phase 1.
Acceptance criteria:
- no `localStorage` reference anywhere under `src/core/` — and it cannot be
  reintroduced, since 0002 makes it a lint *and* typecheck failure.
