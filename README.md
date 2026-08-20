# Rhizome

> **Status: early WIP.** The plan is further along than the code. Nothing here
> is usable yet.

An open source, decentralized alternative to TV Time: track the films and
series you watch, follow other people, and get a feed that hides spoilers
based on how far along each viewer actually is.

The difference from every other tracker is where the data lives. There is no
Rhizome database. Each user's list sits in **their own AT Protocol
repository** — the same account and infrastructure as Bluesky — so it is
readable by any client, portable between them, and not ours to lose or hold
hostage. Running the whole thing should cost close to nothing.

## How it fits together

- **No backend of ours.** The app writes records to the user's PDS and reads
  other users' records straight from theirs. Records are public, like
  everything on AT Protocol.
- **One small serverless proxy**, whose only job is to hold the TMDB API key
  and rate-limit. It exists because a key shipped to a browser is a published
  key.
- **Anti-spoiler filtering happens in the reader's browser**, because the
  input to the decision is the reader's own progression. It is a courtesy
  filter over public data, not an access control.

## Stack

|                 |                                                                         |
| --------------- | ----------------------------------------------------------------------- |
| Language        | TypeScript everywhere                                                   |
| Front end       | React 19, Vite 8                                                        |
| Identity & data | AT Protocol — `@atproto/api`, OAuth via `@atproto/oauth-client-browser` |
| Metadata        | TMDB, behind a serverless proxy                                         |
| Styling         | Tailwind + shadcn/ui _(ticket 0003)_                                    |
| State           | Zustand _(ticket 0004)_                                                 |

Items marked with a ticket number are specified but not built yet.

### The one structural rule

`src/core/` — lexicon, records, TMDB client, progression and anti-spoiler
logic — must run unchanged under a different front end. V1 is a web app
because AT Protocol OAuth is far simpler in a browser, but the likely end
state is mobile, and the port should cost the UI rather than the domain
logic.

That boundary is not a convention: it is enforced by ESLint rules and by a
DOM-free TypeScript project that stops compiling if core code reaches for
`window` or `localStorage`. See [`src/README.md`](src/README.md).

## The plan

V1 is scoped to **films and series only**. Games and books are deliberately
out, though the data model is shaped to absorb them later.

- **[`docs/plan/README.md`](docs/plan/README.md)** — how the plan is
  organized, and the workflow per ticket.
- [`docs/plan/roadmap.md`](docs/plan/roadmap.md) — vision, guiding decisions,
  and why the phases are in this order.
- `docs/plan/phases/` — one file per phase, with every ticket's scope and
  acceptance criteria.

Specs say _what_ a ticket is; GitHub Issues say _where it stands_. One source
of truth each, so nothing drifts.

## Configuration

Copy `.env.example` to `.env.local` and fill it in. Every `.env*` file is
gitignored except the example itself.

```sh
cp .env.example .env.local
```

### `VITE_*` variables are public

Vite inlines them into the bundle at build time, as literal strings in the
JavaScript shipped to the browser. Anyone can read them in devtools.

So the rule is short: **a `VITE_*` variable is configuration, never a
credential.** This is exactly why the TMDB API key cannot live in the client
and needs a serverless proxy in front of it — the key is the reason the proxy
exists, not an afterthought.

| Variable              | Where it is set                             | Visible to users           |
| --------------------- | ------------------------------------------- | -------------------------- |
| `VITE_TMDB_PROXY_URL` | `.env.local`, and the host's build settings | yes, inlined in the bundle |
| `TMDB_API_KEY`        | the proxy's own environment only            | no                         |
| `ALLOWED_ORIGINS`     | the proxy's own environment only            | no                         |

The proxy-side variables are listed in `.env.example` too, even though the app
never reads them, so the whole configuration surface is visible in one place
rather than split across two repos' worth of dashboards.

### Reading them

`import.meta.env` is Vite-specific, so it stays out of `src/core/` — the core
is meant to run under a different front end unchanged (see
[`src/README.md`](src/README.md)). Env vars are read at the edge of the app,
in `src/lib/`, and the resulting values are passed into core modules as plain
configuration.

## License

[MIT](LICENSE).

---

Metadata from [TMDB](https://www.themoviedb.org/). This product uses the TMDB
API but is not endorsed or certified by TMDB.
