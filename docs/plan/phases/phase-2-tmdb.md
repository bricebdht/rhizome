# Phase 2 — TMDB integration

Everything that touches TMDB. The API key cannot ship in the client, so a
thin serverless proxy is a hard requirement.

---

### 0201 — TMDB account, API key, attribution
Depends on: —
Goal: legal and operational prerequisites documented.
Scope in:
- Create a TMDB developer account, request an API key (v3 auth).
- Note in `docs/architecture/tmdb.md`: attribution string, terms of use for non-commercial projects, rate limits.
- Keep the key out of the repo; store it wherever the proxy is deployed.
Scope out: any code.

### 0202 — Design the serverless proxy
Depends on: 0201
Goal: choose the host and the shape before writing code.
Scope in:
- Host options compared: Cloudflare Workers, Vercel Functions, Netlify Functions. Pick one with rationale (cold start, free tier, cost model).
- Sketch endpoints: `/search`, `/movie/:id`, `/tv/:id`, `/tv/:id/season/:s`, `/tv/:id/season/:s/episode/:e`.
- Caching strategy (TTL per endpoint, cache key).
- CORS origin allowlist strategy.
- Rate limiting per IP (rough plan).
- Written up in `docs/architecture/tmdb.md`.
Scope out: implementation (0203-0204).

### 0203 — Proxy endpoint: search
Depends on: 0202
Goal: `/search?q=...&type=movie|tv|multi` works end-to-end.
Scope in:
- Proxy repository / directory (`proxy/` at repo root, or separate — decided in 0202).
- One handler for search.
- Basic edge caching.
- Simple integration test / curl example in the README of that folder.

### 0204 — Proxy endpoints: details
Depends on: 0203
Goal: movie / tv / season / episode detail endpoints.
Scope in:
- Handlers for the four detail endpoints.
- Consistent error envelope.
- Cache TTLs longer than search (details change rarely).

### 0205 — Typed TMDB client
Depends on: 0204
Goal: strongly typed functions that hit the proxy; no `any` leaking into features.
Scope in:
- `src/core/tmdb/` with one function per endpoint. The roadmap names the
  TMDB client as code that must survive a different front end, so it sits
  behind the core boundary (0002, 0005) — a native app talks to the same
  proxy with the same types.
- Response types hand-written (small surface) or generated from TMDB's own spec.
- **No env access in `core/`.** The client is created from a config object:
  `createTmdbClient({ baseUrl, fetch })`. `import.meta.env.VITE_TMDB_PROXY_URL`
  is read once in `src/lib/tmdb/client.ts`, which builds the configured
  instance the app uses. `import.meta.env` is Vite-specific; a React Native
  port replaces that one file.
- `fetch` is injected too, defaulting to the global — it keeps tests from
  needing a network stub and costs one parameter.
Scope out: React Query / SWR wiring (added when a feature needs it).
Acceptance criteria:
- `grep -r "import.meta" src/core/` returns nothing.

### 0206 — Attribution notice in the UI
Depends on: 0205
Goal: comply with TMDB's attribution requirement.
Scope in:
- "This product uses the TMDB API but is not endorsed or certified by TMDB." string.
- TMDB logo where required.
- Placed in the app footer, always visible.

### 0207 — Image URL builder
Depends on: 0205
Goal: pick the right poster / backdrop / still size instead of always fetching the largest.
Scope in:
- `buildImageUrl(path, kind, size)` where `kind` is poster|backdrop|still and `size` is a semantic name (thumb|card|hero).
- Sizes documented and mapped to TMDB's supported widths.
- Handles null paths gracefully (placeholder).
