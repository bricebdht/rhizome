# Rhizome — Plan

This directory is the **specification** for V1. Everything here is scoped to
**V1 = movies & series only**.

- `roadmap.md` — vision, guiding decisions, phase order and rationale.
- `phases/phase-N-*.md` — per-phase ticket specs (goal, scope in/out,
  acceptance criteria, dependencies).

## Where the status lives

**Not here.** This directory says _what_ each ticket is; **GitHub Issues** say
_where it stands_. One source of truth for status, so nothing drifts.

| Question                                 | Where to look                                     |
| ---------------------------------------- | ------------------------------------------------- |
| What does ticket 0103 actually cover?    | `phases/phase-1-atproto.md`                       |
| Is 0103 done / who's on it / what broke? | the GitHub issue titled `0103 — …`                |
| What's left in Phase 1?                  | the `Phase 1 — AT Protocol foundations` milestone |
| What should I work on next?              | open issues, filtered by the current milestone    |

Ticket IDs (`NNNN`) are stable and appear in both places: the issue title
starts with the ID and links back to the spec section.

## Conventions

- **Milestone per phase** — `Phase 0 — Bootstrap` … `Phase 8 — Polish & launch`.
- **Labels** — `phase-0` … `phase-8`, plus a type label:
  `type:feat`, `type:chore`, `type:doc`, `type:decision`.
- **Issue title** — `NNNN — Title`, matching the spec heading verbatim.
- **Issue body** — a link to the spec section, plus anything discovered during
  the work. The spec stays authoritative for scope; the issue carries the
  conversation.

## Issue creation is just-in-time

Issues are **not** created for all 9 phases up front — the specs for the later
phases will change once the earlier ones are built (especially after the
lexicon work in Phase 1). Instead:

- Milestones for all phases exist from the start (they're just scaffolding).
- Issues for phase **N+1** are created while phase **N** is in flight.

If the work reveals that a spec is wrong, **fix the spec file in the PR** —
that's the point of keeping it in the repo.

## Workflow per ticket

1. Pick an open issue in the current milestone whose dependencies are closed.
2. Assign it to yourself; branch off `main` (`0103-progress-lexicon`).
3. Read the spec section it links to (goal, scope, acceptance criteria).
4. Implement, keeping the PR scoped to that one ticket.
5. Open the PR with `Closes #NN` in the description.

Keep tickets small enough that a reviewer can read the diff in one sitting. If
a ticket grows beyond that, split it — in the spec _and_ in the issues.

## Phases

| #   | Phase                                      | Spec                                                        |
| --- | ------------------------------------------ | ----------------------------------------------------------- |
| 0   | Bootstrap                                  | [phase-0-bootstrap.md](phases/phase-0-bootstrap.md)         |
| 1   | AT Protocol foundations                    | [phase-1-atproto.md](phases/phase-1-atproto.md)             |
| 2   | TMDB integration                           | [phase-2-tmdb.md](phases/phase-2-tmdb.md)                   |
| 3   | Personal list                              | [phase-3-personal-list.md](phases/phase-3-personal-list.md) |
| 4   | Progression tracking                       | [phase-4-progression.md](phases/phase-4-progression.md)     |
| 5   | UI                                         | [phase-5-ui.md](phases/phase-5-ui.md)                       |
| 6   | AppView (episode thread index)             | [phase-6-appview.md](phases/phase-6-appview.md)             |
| 7   | Social feed, episode threads, anti-spoiler | [phase-7-social-feed.md](phases/phase-7-social-feed.md)     |
| 8   | Polish & launch                            | [phase-8-polish-launch.md](phases/phase-8-polish-launch.md) |

See [roadmap.md](roadmap.md) for why the phases are in this order.
