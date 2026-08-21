# Rhizome — Roadmap

## Vision

An open source, decentralized alternative to TV Time. User data lives in each
user's own AT Protocol repository (their PDS), not in a central database.
Cost-to-run should stay low — a few euros a month, not zero: episode threads
need an index that no client-side query can replace (phase 6). The
distinctive feature is a
progression-aware social feed that hides spoilers based on where each viewer
actually is in a show.

**V1 scope: movies and series only.** Games and books are explicitly out for
V1, but the data model is designed to absorb them later without a lexicon
rewrite.

## Guiding decisions

- **Language: TypeScript everywhere for V1.** The official `@atproto` SDK is
  the most mature; adding a second language while learning the protocol would
  add cognitive load for no clear gain. The AppView stays TypeScript too:
  Jetstream delivers plain JSON rather than CBOR/CAR, which removes the main
  argument for writing a firehose consumer in Go.
- **Schema changes are near-impossible after publication.** Records live in
  users' repos, which we cannot write to, so AT Protocol forbids breaking
  lexicon changes rather than offering a migration path: optional fields can
  be added, nothing else. A real break means a new NSID and reading both
  collections forever. V1 therefore drafts under
  `app.rhizome.experimental.*` and promotes once the shape has survived being
  built on (tickets 0101, 0102, 0104).
- **Data model: one generic `progress` object** in the lexicon, shaped
  differently per media type (season/episode for series, boolean for films,
  percent/hours for games, page/chapter for books). The anti-spoiler engine
  compares two `progress` values regardless of media type.
- **Metadata source: TMDB for V1**, pending the explicit comparison in ticket
  0200 — keyless alternatives exist (TVmaze covers series with no key at all;
  Cinemeta covers both but is undocumented infrastructure), and one of them
  could remove the proxy from part of the app. External IDs only in the AT
  records; no duplication of metadata into user repos, which is also what
  keeps a source change from being a migration.
- **Identity: reuse the public Bluesky PLC directory** to resolve DIDs.
  Self-hosting a PLC is a future option, not V1.
- **Auth: AT Protocol OAuth, no app passwords** (ticket 0106). Rhizome never
  sees a credential. The OAuth client is browser-specific and lives in
  `src/lib/atproto/oauth/`, outside the core boundary — a native port
  rewrites that file and keeps everything else.
- **Two backend components, both deliberately small.** A serverless proxy
  hiding the TMDB API key and centralizing rate limiting, and an **AppView**
  indexing episode comments and spoiler flags (phase 6).
  The AppView is an **index, never a source of truth**: writes go straight
  from the client to the user's PDS, and wiping the index would lose nothing
  a firehose replay cannot rebuild. The test to keep applying — _if we
  deleted it, would any user lose data?_ — must stay answerable with "no".
  Everything else runs client-side.
- **Aggregation is decided per data type, not globally** (tickets 0601-0602):
  - **Media entries** — pulled from follows client-side. The reader only ever
    needs the accounts they follow, and direct repo reads keep working when
    the AppView is down. Cost is one request per followed account, so this
    degrades with follow count, not with anyone's popularity; the ceiling is
    documented in 0701 and is the trigger for indexing entries later.
  - **Episode comments and spoiler flags** — through the AppView. A thread
    limited to accounts you follow is not a thread: empty for a new user, and
    the point of episode discussion is that strangers are in it. No client-
    side query can ask "who wrote about this episode?".
- **Anti-spoiler = a progression gate plus reader flags.** You reach an
  episode's discussion once you have marked that episode as seen; anything
  spoilery inside it can be flagged by readers and renders blurred until
  clicked. There is no cross-user progression comparison — anchoring
  discussion to episodes already carries the information such a comparison
  would reconstruct.
  It runs client-side because the input is the viewer's own progression, and
  it is a **courtesy layer, not access control**: comments are public records
  readable straight from repos by anyone bypassing our UI.
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
7. **AppView** — the index that makes network-wide episode threads possible.
   It comes before the social feed because that feature cannot exist without
   it, and because standing up an always-on service is its own kind of work:
   deployment, cursor persistence, backfill, alerting.
8. **Social feed, episode threads, anti-spoiler** — the defining feature. It
   requires everything above: identity, other users' records, progression,
   and the index.
9. **Polish & launch** — README, screenshots, launch post. Only meaningful
   once phases 1-8 produce something worth showing.

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
- Self-hosted PLC
- i18n (V1 UI is English only)
- Mobile-native app (V1 is a responsive web app; see the platform-agnostic
  core decision above — the port is planned for, not scheduled)
- PWA packaging (manifest + service worker). Cheap to add at any point
  with `vite-plugin-pwa`, and not a substitute for a native app —
  installed web apps stay constrained on iOS.
- Import from TV Time / Trakt / Letterboxd
