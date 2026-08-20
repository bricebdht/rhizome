# rhizome

Exploring AT Protocol by building a decentralized, TV Time-style media tracker. Work in progress, films/series first.

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
