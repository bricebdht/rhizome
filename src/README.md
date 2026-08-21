# `src/` layout

Two questions decide where a file goes:

1. **Does it need to know it runs in a browser?** If yes, it cannot live in
   `core/`.
2. **Would this make sense inside a UI-less npm package?** If yes, it
   probably belongs in `core/`.

## The layers

| Folder        | What lives here                                                                                           | Survives a React Native port?      |
| ------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `app/`        | app shell: root component, routing, providers                                                             | no                                 |
| `components/` | reusable presentational components (shadcn/ui lives here)                                                 | no                                 |
| `features/`   | one folder per feature: its UI, hooks, and glue                                                           | no                                 |
| `state/`      | Zustand slices                                                                                            | no                                 |
| `lib/`        | **the web layer**: browser-specific adapters `core/` is handed, plus web-only helpers (`cn`, env reading) | no, but it is small and deliberate |
| `core/`       | **platform-agnostic domain code**                                                                         | **yes — this is the point**        |
| `types/`      | shared ambient / cross-cutting types                                                                      | n/a                                |

Folders are created when something goes in them, not up front.

## `core/` — the part that has to survive

Planned contents, each arriving with its ticket:

- `atproto/` — record CRUD, agent wiring, DID resolution. **Not** the OAuth
  client (0106): that is redirects, WebCrypto and IndexedDB, so it lives in
  `lib/`.
- `lexicon/` — types and validation, including the generated artifacts from 0105.
- `tmdb/` — the typed client (0205), built from an injected config object.
- `progress/` — progression comparison and the anti-spoiler rules (0702, 0704).
- `storage/` — the async `Storage` **interface** only (0009).

Rules, in one line each:

- No `window`, no `document`, no `localStorage`, no `navigator`.
- No React, no components, no Zustand.
- No `import.meta.env` — configuration is passed in, not read.
- **`core/` never imports from `lib/`.** The direction is one-way: the app
  builds the browser adapter and hands it to the core. Inverting this is the
  single easiest way to void the whole exercise, which is why it is a lint
  error and not a convention.

Two clarifications worth keeping in mind, because they are easy to get wrong:

- `core/` is **not** a backend. It ships to the device in the same bundle as
  the UI and can hold no secret — that is exactly why the TMDB key needs a
  proxy. Think library, not tier.
- Validation in `core/lexicon/` is **UX, not security**. The user's PDS is
  the only authority, and a user can write to their own repo without going
  through this app.

The boundary is enforced by the ESLint rules and the DOM-free
`tsconfig.core.json` in ticket 0002 — not by good intentions.

### A note on `lib/utils.ts`

shadcn/ui generates its `cn()` class-name merger at `@/lib/utils`, and every
snippet on its site imports from there. That path stays as-is rather than
being relocated somewhere more semantically precise: the helper is web-only
either way, `core/` cannot import it (lint error), and diverging from the
convention would break every component someone pastes in later.

So read `lib/` as _the web layer_ rather than strictly _adapters_. The
guarantee that matters is the one-way dependency, and that is enforced.

## Imports

Use the `@/*` alias, never `../../..`:

```ts
import { isSpoiler } from '@/core/progress/spoiler'
```

The alias is declared twice, and both are required: `paths` in
`tsconfig.base.json` for the typechecker, `resolve.alias` in `vite.config.ts`
for the bundler. Changing one without the other produces a build that
typechecks and does not run, or the reverse.

It sits in `tsconfig.base.json` rather than in `tsconfig.app.json`
specifically so that **every** TS project inherits it — including the
DOM-free `tsconfig.core.json` from 0002. Declaring it only on the app
project would let `@/core/...` imports resolve for the app and Vite while
failing the core typecheck, which is the one check the boundary depends on.

See [`docs/plan/roadmap.md`](../docs/plan/roadmap.md) for why this boundary
exists at all.
