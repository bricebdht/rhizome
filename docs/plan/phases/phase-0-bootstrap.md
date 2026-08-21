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

Depends on: 0001, 0005
Goal: enforce a consistent code style and strict typing from day one.
Scope in:

- ESLint config (typescript-eslint recommended + react + hooks), flat config.
- Prettier config; ESLint and Prettier don't fight (`eslint-config-prettier`
  last in the chain). Markdown included — the specs and READMEs are part of
  the deliverable, and an unformatted convention drifts between
  contributors. Prettier reflows the ticket blocks a little (a blank line
  after each heading and before each list); that is the price of the
  guarantee, and it aligns the tables for free.
- `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- `npm run lint`, `npm run typecheck`, `npm run format` scripts.
- **Layer boundary rules** enforcing that `src/core/` stays platform-agnostic
  (see 0005 for the layout, and the guiding decision in `roadmap.md`).
  All three of the following are needed — the import rules alone do not stop
  a core module from reaching for a browser global:
  - `import/no-restricted-paths` — `src/core/` may not import from `app/`,
    `features/`, `components/`, `state/` **or `lib/`**. The dependency
    direction is one-way: the UI and the platform adapters consume the core,
    never the reverse. `lib/` is in the list because it _is_ the browser
    layer: core receives its adapters by injection (see 0009), it never
    imports one.
  - `no-restricted-imports` scoped to `src/core/**` — bans `react`,
    `react-dom`, and the `@/app/*`, `@/components/*`, `@/features/*`,
    `@/state/*`, `@/lib/*` aliases (the alias form bypasses
    `no-restricted-paths`, so both rules are required).
    Uses `eslint-plugin-import-x`, not `eslint-plugin-import`: the
    `eslint-import-resolver-typescript` package pulls in the latter, which
    peer-depends on ESLint ≤ 9 and cannot be installed alongside ESLint 10.
    The rule needs `settings['import-x/resolver'].node.extensions` to include
    `.ts`/`.tsx` — without it the resolver never finds an extensionless
    `../lib/...` import and the rule passes silently.
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
  - `import { createWebStorage } from '@/lib/storage/web'` → fails
    `npm run lint`.
  - the same import written relatively, `'../lib/storage/web'` → fails
    `npm run lint`. Worth testing separately: it goes through a different
    rule than the alias form, and it is the one that fails silently when the
    resolver is misconfigured.
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
- Convention documented in `src/state/README.md` (one slice per file, hook
  naming, and selecting narrowly rather than subscribing to the whole store).
- Two boundaries written down while they are cheap to state: PDS records are
  not mirrored into a slice, and `core/` never reads from `state/`.

Scope out: any real state (auth, list, feed) — created with their features.

Acceptance criteria:

- an import of `@/state/*` or of `zustand` from inside `src/core/` fails
  `npm run lint`.

### 0005 — Folder structure & path aliases

Depends on: 0001
Goal: predictable module layout, no `../../..` imports, and a one-way
dependency boundary around the platform-agnostic core.
Scope in:

- `src/` layout: `app/`, `components/`, `core/`, `features/`, `lib/`,
  `state/`, `types/`.
- `src/core/` is the layer that must survive a future React Native front end:
  `atproto/` (records, agent, DID resolution — _not_ the OAuth client),
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
- `@/*` path alias configured in `tsconfig.base.json` and in
  `vite.config.ts`. Both are required — one for the typechecker, one for the
  bundler.
  The Vite template uses project references, so the root `tsconfig.json`
  holds no `compilerOptions` and cannot carry the mapping. It goes in a
  shared `tsconfig.base.json` that every project extends, **not** in
  `tsconfig.app.json`: `tsconfig.core.json` (0002) must inherit the same
  `paths`, or `@/core/...` imports would resolve for the app and Vite while
  failing the DOM-free core typecheck.
- Short `src/README.md` explaining the layout convention and the core
  boundary — including the test to apply when unsure where a file goes:
  _would this make sense inside a UI-less npm package?_

Scope out:

- creating empty folders for features that don't exist yet. The layout is
  documented in `src/README.md`; directories appear when a ticket puts
  something in them (git does not track empty ones anyway).
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

- Single workflow: install → lint → format check → typecheck → build.
  `format:check` is included even though the ticket did not list it: a
  formatter nobody verifies is a suggestion, and it is one line here.
- Runs on pushes to `main` and on every pull request.
- Node LTS, npm cache, `npm ci` (not `npm install`) so the lockfile is
  authoritative and a drifted `package.json` fails loudly.
- Steps kept separate rather than `&&`-chained, so a failure names itself.
- Concurrency group cancelling superseded runs on the same ref.

Scope out: tests (no test suite yet), deploy pipeline.

Acceptance criteria: workflow green on `main` after the first push.

### 0008 — Environment variables strategy

Depends on: 0001
Goal: convention for env vars, safe defaults committed.
Scope in:

- `.env.example` listing all required vars with placeholder values.
- Documented in the README: which are public (`VITE_*`) vs proxy-side only.
- `.env` and `.env.local` in `.gitignore` (verify).
- Proxy-side variables listed in `.env.example` as well, even though the app
  never reads them — one visible configuration surface beats two dashboards.

Scope out: actually setting real values (proxy phase).

Acceptance criteria:

- `git check-ignore` confirms `.env`, `.env.local` and `.env.production` are
  ignored while `.env.example` is not.

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
  reintroduced, since 0002 makes it a lint _and_ typecheck failure.
