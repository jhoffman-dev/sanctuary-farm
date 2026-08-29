# Sanctuary Farm 🌾

A multiplication-fluency game for a 10-year-old. Top-down walkable farm; feeding the
animals *is* the quiz. Exploration reveals, math advances — every point of progress comes
from a graded answer and nothing else.

## Run it

```bash
npm install
npm run dev            # the game
npm run dev            # then open http://localhost:5173/?dev=1 for component dev routes
npm test               # vitest
npm run typecheck
npm run lint
npm run build          # -> dist/  (static; deploy anywhere)
```

Node ≥ 20 (built on 26). Stack: Vite 8 · React 19 · TypeScript (strict) · Tailwind 4 ·
`motion` · Vitest. All art is inline SVG, all sound is Web Audio synthesis — no asset files.
Persistence is a single versioned `localStorage` key. No backend, no network at runtime.

## How it's built

- **`docs/SPEC.md`** — canonical spec. `docs/original-spec.md` — the plan it grew from.
- **`docs/CONTRACTS.md`** + **`src/contracts/`** — the shared type surface (frozen).
- **`docs/AGENTS.md`** — file-ownership map for the parallel track build.
- **`docs/resolved-decisions.md`** — the 13 spec ambiguities and how each was settled.
- **`docs/tracks/`** — per-track briefs (A engine · B quiz · C world · D creatures · E infra)
  and the Phase 2 integration brief.

Source layout: `src/engine` (scheduler) · `src/quiz` · `src/world` · `src/creatures` +
`src/barn` · `src/save` + `src/audio` + `src/parent` · `src/game` (Phase 2 screen graph).

## Deploy

Static build. `vercel.json` is included (`npm run build` → `dist/`). On the iPad, open the
deployed URL in Safari and *Add to Home Screen* — `manifest.webmanifest` + the icons make it
open full-screen with no browser chrome.

## The parent dashboard

Long-press the 🏡 sign on the farmyard, then answer the multiplication gate. Shows the 12×12
box/latency heatmap, the ten slowest facts, and daily practice + accuracy for two weeks.
The number that matters is the **latency on the hard-core set** (`7×8, 6×8, …`) — if those
are still slow after two weeks, raise `WEIGHT_HARD_CORE_BONUS` in
`src/contracts/constants.ts`.

## Non-negotiables (`CLAUDE.md` has the full list)

No multiple choice. No punishment for absence. Latency drives promotion, not mere
correctness. Sessions end on time — the game says goodnight, never "one more". Interleave
families, never block-drill.
