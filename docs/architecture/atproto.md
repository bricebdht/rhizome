# How Rhizome uses AT Protocol

Written so nobody has to re-derive this from the spec. It covers the
vocabulary, what we implement versus what we delegate, the three flows that
matter, and the one constraint that shapes every data decision: **we do not
own the database, and we can never migrate it.**

## Vocabulary

| Term                 | What it is                                                                              | In Rhizome                                            |
| -------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **DID**              | permanent identifier for an account, e.g. `did:plc:abc123…`. Survives a handle change.  | the only stable way to refer to a user                |
| **Handle**           | human-readable name, e.g. `brice.bsky.social`. Resolves to a DID; can change.           | what the user types to log in                         |
| **PDS**              | Personal Data Server — hosts a user's repo and acts as their OAuth authorization server | **the backend of Rhizome.** We do not run one         |
| **Repo**             | one user's entire signed data store                                                     | where a user's list lives                             |
| **Collection**       | all records of one type inside a repo                                                   | `app.rhizome.media.entry`                             |
| **Record**           | one JSON object in a collection                                                         | one film or series entry                              |
| **Lexicon**          | the schema defining a record or an XRPC method                                          | `lexicons/` in this repo                              |
| **NSID**             | reverse-DNS name of a lexicon                                                           | schema name, collection path and `$type`, all at once |
| **rkey**             | record key, unique within a collection. Usually a TID                                   | identifies one entry                                  |
| **AT-URI**           | `at://<did>/<collection>/<rkey>`                                                        | the address of a single record                        |
| **PLC directory**    | public service resolving `did:plc:` to a DID document                                   | how we find someone's PDS                             |
| **Relay / firehose** | aggregates repo commits network-wide                                                    | not used in V1 (see 0602)                             |

A record on the wire carries its own type, so any client can identify it
without asking us:

```json
{
  "$type": "app.rhizome.media.entry",
  "mediaType": "series",
  "externalRef": { "source": "tmdb", "id": "95396" },
  "status": "watching",
  "progress": { "kind": "series", "season": 1, "episode": 4 },
  "createdAt": "2026-08-21T18:12:00Z"
}
```

stored at `at://did:plc:abc123…/app.rhizome.media.entry/3k2j5xq…`.

## What we implement, and what we delegate

We delegate almost everything:

- **Identity** — the public PLC directory resolves DIDs. Self-hosting a PLC
  is a post-V1 option.
- **Storage and auth** — the user's PDS. It stores the repo, authenticates
  the user, and issues tokens. Most of our users' PDSes will be Bluesky's.
- **Aggregation of media entries** — none. The follows feed reads the follow
  list from Bluesky's AppView, then queries each followed repo directly
  (0701). Kept that way on purpose: it survives our own infrastructure being
  down.

We implement four things:

- **Lexicons** describing our records (`lexicons/`) — media entries, episode
  comments, spoiler flags.
- **A client** that reads and writes them (`src/core/atproto/`).
- **Anti-spoiler logic** applied at read time, in the reader's browser
  (`src/core/progress/`).
- **An AppView** (phase 6) indexing episode comments and spoiler flags,
  because showing every comment on one episode needs records scattered
  across thousands of repos and no client-side query can ask _"who wrote
  about this episode?"_.

So there are two backend components, both small and both deliberate:

|                | Why it exists                                                   | What breaks without it |
| -------------- | --------------------------------------------------------------- | ---------------------- |
| **TMDB proxy** | an API key cannot ship in a browser (under review, ticket 0200) | search and metadata    |
| **AppView**    | network-wide episode threads are unanswerable client-side       | episode threads only   |

**Neither is a source of truth.** Writes always go from the client straight
to the user's PDS; the AppView only ever reads, and learns about new records
from the firehose like anyone else. The test to keep applying: _if we
deleted it, would any user lose data?_ The answer must stay no — the index
is rebuilt by replaying the firehose.

That is also why the follows feed does not route through it (0602, 0607). An
outage should cost episode threads and nothing else. If the app stops working
without our server, we have rebuilt a centralized product with extra steps.

## Flow 1 — Login (OAuth)

The user types a handle. They never type a password into Rhizome; the
credential prompt happens on their own PDS.

```
User            Rhizome (browser)        PLC / PDS
 |                    |                      |
 | handle             |                      |
 |------------------->|                      |
 |                    | resolve handle -> DID -> PDS
 |                    |--------------------->|
 |                    |   DID document       |
 |                    |<---------------------|
 |                    |                      |
 |                    | fetch auth-server metadata
 |                    |--------------------->|
 |                    |                      |
 |                    | generate PKCE challenge + DPoP keypair
 |                    |                      |
 |                    | PAR: client_id, scopes, PKCE, DPoP proof
 |                    |--------------------->|
 |                    |   request_uri        |
 |                    |<---------------------|
 |                    |                      |
 |  redirect to authorize endpoint           |
 |<-------------------|                      |
 |                                           |
 |  authenticate + approve scopes            |
 |------------------------------------------>|
 |                                           |
 |  redirect back with ?code=...             |
 |<------------------------------------------|
 |                    |                      |
 |------------------->|                      |
 |                    | exchange code (PKCE verifier + DPoP proof)
 |                    |--------------------->|
 |                    |   access + refresh, DPoP-bound
 |                    |<---------------------|
 |                    |
 |                    | verify `sub` == expected DID
```

Four details worth keeping in mind:

- **`client_id` is a URL** — the address of our own client metadata JSON.
  There is no registration step and no client secret; the document _is_ the
  registration. We serve it at `/oauth/client-metadata.json`.
- **Tokens are DPoP-bound.** Every request carries a proof signed by a
  session keypair, so a stolen token is useless without the private key.
- **Scopes**: `atproto` (required) plus `transition:generic` for now.
- All of this is browser-specific — redirects, WebCrypto, IndexedDB — which
  is why the OAuth client lives in `src/lib/atproto/oauth/` and never in
  `core/`. A native port rewrites that file and nothing else.

## Flow 2 — Writing a media entry

```
Rhizome (browser)                 user's PDS
      |                                |
      | validate against our lexicon   |   <- UX only, see below
      |                                |
      | com.atproto.repo.createRecord  |
      |   collection: app.rhizome.media.entry
      |   record: { $type, mediaType, ... }
      |------------------------------->|
      |                                | sign + append to repo
      |                                | announce commit on the firehose
      |   { uri, cid }                 |
      |<-------------------------------|
```

Validation on our side is **UX, not security**. The PDS is the only
authority, and the user can write to their own repo with any client. Our
validation stops _us_ from writing nonsense; it stops nobody else.

## Flow 3 — Reading someone else's records

No permission step: repos are public.

```
Rhizome (browser)          Bluesky AppView         each followed PDS
      |                          |                        |
      | app.bsky.graph.getFollows|                        |
      |------------------------->|                        |
      |   list of DIDs           |                        |
      |<-------------------------|                        |
      |                                                   |
      | for each DID: resolve PDS, then                   |
      | com.atproto.repo.listRecords                      |
      |   collection: app.rhizome.media.entry             |
      |-------------------------------------------------->|
      |   records                                          |
      |<--------------------------------------------------|
      |
      | merge and sort by updatedAt
      |
      | (no spoiler filtering here: discussion lives in
      |  episode threads, gated by the reader's own
      |  progression — see docs/architecture/anti-spoiler.md)
```

## Records are public

Nothing in a user's repo is private. Every entry, note and rating is
readable by anyone who knows the DID — that is not a gap in the design, it
is the design.

Two consequences we should never lose sight of:

- **The anti-spoiler design is a courtesy, not access control.** It has two
  mechanisms: you reach an episode's discussion once you have marked that
  episode as seen, and readers can flag a comment so it renders blurred until
  clicked. Both run in the reader's browser, over records anyone can fetch in
  the clear. They protect people who want protecting; they stop nobody
  determined. In particular, "you get access after marking it seen" is a gate
  in _our interface_ — the comments are public records either way.
- **Deletion is best-effort.** Removing a record takes it out of the repo,
  but it has already been announced on the firehose and may live on in other
  people's indexes.

## Schema evolution

There is no `ALTER TABLE`. Records live in thousands of repos we cannot
write to, so AT Protocol does not offer a migration path — it removes the
need for one by forbidding breaking changes.

**Allowed** on a published lexicon: adding **optional** fields, deprecating a
field.

**Forbidden**: removing a field, renaming one, changing a type, or adding a
**required** field.

A genuine break means publishing a **new NSID** and reading both collections
indefinitely. The old one never fully disappears.

Three consequences follow, and all three are design constraints rather than
advice:

1. **Reads must tolerate everything ever written.** Unknown fields are
   ignored, absent optional fields get defaults. This is what makes migration
   unnecessary rather than merely painful.
2. **Records upgrade lazily, on write.** We cannot write to a user's repo —
   but they can, through the app. Any edit rewrites the record in the current
   shape, so active users migrate themselves without noticing. Dormant users
   never do, which point 1 makes survivable.
3. **There is no moment when everyone is on the new version.** A "rebuild my
   library" action can be offered. It cannot be imposed.

### Why we are on an experimental namespace

The spec freezes a lexicon as soon as a third party adopts it — _even without
our permission_. The point of no return is therefore the day someone else
reads us, not the day we decide we have shipped V1.

So V1 drafts under `app.rhizome.experimental.*` and promotes to
`app.rhizome.*` once the shape has survived being built on. Test records
written under the experimental NSID are left behind in their own collection;
nothing needs migrating.

Promotion is a statement about **data**, not a deployment: the app can be in
production while the namespace is still experimental. It is also the one
"migration" that stays possible, because both collections sit in the _user's
own_ repo and they are logged in — a client can read the old and write the
new with their consent.

This is also why `createdAt` is required in `app.rhizome.media.entry` from
the very first draft. A required field can never be added to a published
lexicon, so this is the only window in which it can exist at all.

## See also

- [`docs/plan/roadmap.md`](../plan/roadmap.md) — guiding decisions
- [`src/README.md`](../../src/README.md) — the core/adapter boundary
- [AT Protocol specs](https://atproto.com/specs/atp) —
  [lexicon](https://atproto.com/specs/lexicon),
  [OAuth](https://atproto.com/specs/oauth),
  [repository](https://atproto.com/specs/repository)
