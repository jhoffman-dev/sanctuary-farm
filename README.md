# Sanctuary Farm 🌾

A math-fluency game wrapped in a farm to care for. Kids feed animals, hatch
eggs, and tend the paddock — every action is powered by a math answer they type.
No multiple choice. The game advances only as they get faster, and it says
goodnight on time.

**Free forever. No ads. No purchases. No personal information collected.**
Reachable by any kid on any device from a link.

> **Status:** early alpha. The prototype in `src/` is playable; the project is
> being rebuilt on a clean architecture (monorepo, react-three-fiber, real test
> coverage). See `docs/implementation-plan.md`.

## Start here

| Doc | What |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | how work is done here — architecture, clean code, testing, workflow |
| [`docs/PRD.md`](docs/PRD.md) | what we're building and why, and the alpha definition |
| [`docs/architecture.md`](docs/architecture.md) | Clean Architecture layers + the dependency rule |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | phases 0–6 |
| [`docs/adr/`](docs/adr/) | decisions that are expensive to reverse (stack, identity) |
| [`docs/notion-board.md`](docs/notion-board.md) | the ticket board — schema, setup, flow |

Prototype-era design notes: `docs/redesign-notes.md`, `docs/SPEC.md`,
`docs/original-spec.md`.

## Run the prototype

```bash
npm install
npm run dev          # game at http://localhost:5173  (dev routes: ?dev=1)
npm test             # vitest  (162 tests)
npm run typecheck
npm run lint
npm run build        # -> dist/  (static)
npm run smoke        # Playwright walkthrough -> screenshots in ../Debugging Images/
```

Node ≥ 20 (built on 26; Homebrew install → `export PATH="/opt/homebrew/bin:$PATH"`).
Prototype stack: Vite 8 · React 19 · TypeScript strict · Tailwind 4 · `motion` ·
Vitest. Inline-SVG art, Web-Audio sound, single versioned `localStorage` key.

## The landing page

`apps/landing/` — static homepage (mission, status, future games). `npx serve apps/landing`.

## Agents & skills

`.claude/agents/` — `architect`, `domain-dev`, `app-dev`, `qa`, `reviewer`,
`devops`. `.claude/skills/` — `write-ticket`, `notion-board`, `adr`,
`feature-workflow`. Cross-agent notes: `.claude/memory/`.

## Parent dashboard

Long-press the 🏡 sign on the farmyard, answer the math gate. Shows the 12×12
latency heatmap, the slowest facts, and two weeks of practice + accuracy. The
number that matters is **latency on the hard-core set** (`7×8, 6×8, …`).

## Non-negotiables (full list in `CLAUDE.md`)

No multiple choice. No punishment for absence — animals get glum, never gone.
Latency drives promotion, not mere correctness. Sessions end on time. Interleave
families, never block-drill. No ads, no purchases, no PII.
