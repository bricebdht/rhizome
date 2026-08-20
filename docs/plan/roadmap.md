# Rhizome — Roadmap

## Vision

An open source, decentralized alternative to TV Time. User data lives in each
user's own AT Protocol repository (their PDS), not in a central database.
Cost-to-run should stay close to zero. The distinctive feature is a
progression-aware social feed that hides spoilers based on where each viewer
actually is in a show.

**V1 scope: movies and series only.** Games and books are explicitly out for
V1, but the data model is designed to absorb them later without a lexicon
rewrite.

## Guiding decisions

- **Language: TypeScript everywhere for V1.** The official `@atproto` SDK is
  the most mature; adding a second language while learning the protocol would
  add cognitive load for no clear gain. A Go firehose consumer or a light
  custom AppView is a candidate for phase 2.
- **Data model: one generic `progress` object** in the lexicon, shaped
  differently per media type (season/episode for series, boolean for films,
  percent/hours for games, page/chapter for books). The anti-spoiler engine
  compares two `progress` values regardless of media type.
- **Metadata source: TMDB for V1.** External IDs only in the AT records; no
  duplication of TMDB metadata into user repos.
- **Identity: reuse the public Bluesky PLC directory** to resolve DIDs.
  Self-hosting a PLC is a future option, not V1.
- **Auth: AT Protocol OAuth, no app passwords** (ticket 0106). Rhizome never
  sees a credential. The OAuth client is browser-specific and lives in
  `src/lib/atproto/oauth/`, outside the core boundary — a native port
  rewrites that file and keeps everything else.
- **Backend: a small serverless proxy** only to hide TMDB (and later IGDB)
  API keys and centralize rate limiting. Everything else runs client-side.
- **Feed aggregation (V1): pull from Bluesky follows client-side.** A custom
  AppView / firehose consumer is a phase-2 candidate once the core app is
  usable.
- **Anti-spoiler filtering happens client-side in V1**, because the
  viewer's own progression is the input and the viewer is the one who needs
  the filter applied.
- **V1 is a web app, but the core stays platform-agnostic.** The likely
  end state is a mobile app; starting on the web is a deliberate first step,
  not a change of destination. Web first because AT Protocol OAuth is far
  simpler in a browser (`@atproto/oauth-client-browser`, hosted client
  metadata, plain redirect) than in React Native (deep links, secure storage,
  native crypto for DPoP keys) — and stacking that on top of learning the
  protocol buys nothing.
  What actually protects the investment is the layering, not the framework:
  everything in `src/core/` (lexicon, records, TMDB client, progression and
  anti-spoiler engine) must run unchanged under a different front end, and
  the boundary is enforced by lint (see tickets 0002, 0005, 0009).
  Corollaries worth stating, since they are easy to get wrong:
  - `core/` is **not** a backend. It ships to the user's device, in the same
    bundle as the UI. It can hold no secret — that is precisely why the TMDB
    key needs the proxy. Think of it as a library the app consumes, not as a
    tier.
  - The backend of Rhizome is the **user's PDS**, which we do not run. Any
    validation done in `core/lexicon/` is UX, not security: the PDS is the
    only authority, and a user can write to their own repo without going
    through this app.
  - The UI layer (`components/`, `features/`, Tailwind, shadcn/ui) is
    **disposable by design** — none of it survives a move to React Native.
    That is an accepted cost, and a reason to keep the UI polish phase
    (`phases/phase-5-ui.md`) proportionate.

## Phase order and rationale

The order matters: each phase unlocks the next.

1. **Bootstrap** — you can't ship anything without a project that lints,
   builds, and deploys. Keep it minimal.
2. **AT Protocol foundations** — the lexicon is the shape of the whole
   product. Getting it wrong means rewriting everything downstream. Auth is
   the second hard prerequisite: no session, no writes.
3. **TMDB** — needed to search and display anything. Proxy first because the
   API key can't ship in the client.
4. **Personal list** — the first user-visible loop: search → add → see it in
   my list. This is the minimum useful product.
5. **Progression** — turns the list into a tracker. Series is the harder
   case (season/episode); film is a special case of it.
6. **UI polish** — until this phase the UI can stay ugly. This phase is
   where the app becomes pleasant to use.
7. **Social feed with anti-spoiler** — the defining feature. It requires
   everything above to be in place: identity, other users' records, a way to
   compare progressions.
8. **Polish & launch** — README, screenshots, launch post. Only meaningful
   once phases 1-7 produce something worth showing.

## Ticket-file conventions

Each phase file (`phases/phase-N-*.md`) lists its tickets with the same
shape:

```
### NNNN — Title

Depends on: NNNN, NNNN
Goal: one sentence.
Scope in:

- bullets — what this ticket delivers.

Scope out:

- bullets — what this ticket explicitly does NOT deliver.

Acceptance criteria:

- bullets — how we know it's done.

Notes: open questions, links, decisions taken during work.
```

A label that follows a bullet list needs a blank line before it. Without
one, markdown reads it as a continuation of the last bullet and Prettier
indents it accordingly — the label then renders inside the list instead of
introducing the next section.

Don't hand-tune the spacing: `npm run format` covers markdown too, so the
shape is enforced rather than agreed. Run it before opening a PR.

These files hold the **spec only — never the status**. Status lives in GitHub
Issues (one issue per ticket, titled `NNNN — Title`, grouped under a milestone
per phase). See [README.md](README.md) for that workflow.

Keep tickets small enough that a reviewer can read the diff in a single
sitting. If a ticket grows beyond that, split it.

## Out of scope for V1 (parked for later)

- Games (IGDB integration)
- Books (Google Books / Open Library, manual progression)
- Custom AppView / firehose consumer (Go)
- Self-hosted PLC
- i18n (V1 UI is English only)
- Mobile-native app (V1 is a responsive web app; see the platform-agnostic
  core decision above — the port is planned for, not scheduled)
- PWA packaging (manifest + service worker). Cheap to add at any point
  with `vite-plugin-pwa`, and not a substitute for a native app —
  installed web apps stay constrained on iOS.
- Import from TV Time / Trakt / Letterboxd
