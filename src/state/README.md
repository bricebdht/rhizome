# `src/state/`

Zustand slices. One slice per file, named `useXStore`, exported from that
file — no barrel, no root store. Adding state to the app means adding a file
here, not editing a shared object.

## The pattern

```ts
interface UiState {
  isNavOpen: boolean
  toggleNav: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  isNavOpen: false,
  toggleNav: () => set((state) => ({ isNavOpen: !state.isNavOpen })),
}))
```

Actions live in the store next to the state they change. A component should
never need a setter plus a rule about how to call it.

## Select narrowly

```ts
const isNavOpen = useUiStore((s) => s.isNavOpen) // re-renders on this field
const store = useUiStore() // re-renders on every field, in every subscriber
```

The second form is the one that quietly makes an app slow: it looks the same
in a diff and it works fine until the store has more than two fields.

## What does _not_ go here

- **Data that lives in a PDS.** Records are fetched, cached, and written
  through the core layer; a Zustand mirror of them becomes a second source
  of truth that drifts from the first. State here is UI state — what is
  open, what is selected, what is being edited right now.
- **Anything `src/core/` needs.** The core cannot import from `state/` (it
  is a lint error — see `src/README.md`), and that direction is deliberate:
  domain logic takes its inputs as arguments so it can run under a different
  front end, or in a test, with no store mounted.

## If a slice ever needs persistence

Zustand's `persist` middleware defaults to `localStorage`, which puts a
browser API back in the app's dependency path. Pass the `Storage` adapter
from `@/core/storage` instead — that is what it exists for.
