# Sanctuary Farm 🌾

A math-fluency game wrapped in a farm to care for. Kids feed animals, hatch
eggs, and tend the paddock — every action is powered by a math answer they type.
No multiple choice. The game advances only as they get faster, and it says
goodnight on time.

**Free forever. No ads. No purchases. No personal information collected.**
Reachable by any kid on any device from a link.

> **Status:** rebuilding from a clean base (2026-09-07). The learning engine,
> saves and sound live in tested packages; the game world comes next. Work is
> tracked on the Notion board — see `docs/board.md`.

## Start here

| Doc | What |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | how work is done here — architecture, clean code, testing, workflow |
| [`docs/PRD.md`](docs/PRD.md) | what we're building and why, and the alpha definition |
| [`docs/architecture.md`](docs/architecture.md) | Clean Architecture layers + the dependency rule |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | phases 0–6 |
| [`docs/adr/`](docs/adr/) | decisions that are expensive to reverse (stack, identity) |
| [`docs/board.md`](docs/board.md) | the Notion board + docs — schema, views, flow |

The prose docs are mirrored to **Notion** (that's where to read them) —
`docs/README.md` has the links; the markdown here is the authoring surface,
pushed with the `notion-docs` skill. Prototype-era history:
`docs/redesign-notes.md`, `docs/original-spec.md`.

## Layout

```
packages/domain        @sf/domain       the rules: facts, scheduler, mastery, economy — pure
packages/application   @sf/application  use-cases + ports (SaveStore, Clock, Rng, AudioBus)
packages/persistence   @sf/persistence  SaveStore adapters (localStorage now, Firestore later)
packages/audio         @sf/audio        AudioBus adapters (Web Audio synth, silent)
packages/config        @sf/config       shared tsconfig presets
apps/web               @sf/web          the game — React 19 + react-three-fiber; holds zero rules
apps/landing                            static homepage
```

Dependencies point inward (`domain` → nothing … `apps/web` → `application`),
enforced by `pnpm boundaries`. Details: `docs/architecture.md`.

## Run it

```bash
export PATH="/opt/homebrew/bin:$PATH"   # Homebrew Node on this machine
pnpm install
pnpm dev             # game at http://localhost:5173
pnpm gate            # typecheck · lint · boundaries · tests + coverage · build
pnpm e2e             # Playwright smoke (once: pnpm --filter @sf/web exec playwright install chromium)
pnpm test:rules      # firestore.rules against the emulator — needs Java (see firestore/README.md)
```

Node 26 (`.nvmrc`; ≥ 22 works) · pnpm 11 · TypeScript strict · Vitest ·
Playwright · oxlint · dependency-cruiser.

## The landing page

`apps/landing/` — static homepage (mission, status, future games). `npx serve apps/landing`.

## Agents & skills

`.claude/agents/` — `architect`, `domain-dev`, `app-dev`, `qa`, `reviewer`,
`devops`. `.claude/skills/` — `write-ticket`, `notion-board`, `notion-docs`,
`adr`, `feature-workflow`. Cross-agent notes: `.claude/memory/`.

## Non-negotiables (full list in `CLAUDE.md`)

No multiple choice. No punishment for absence — animals get glum, never gone.
Latency drives promotion, not mere correctness. Sessions end on time. Interleave
families, never block-drill. No ads, no purchases, no PII.
