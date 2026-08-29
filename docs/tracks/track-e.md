# Track E — Persistence, audio, parent dashboard

**Branch:** `track/e-infra`
**Owns:** `src/save/store.ts`, `src/audio/sounds.ts`, `src/parent/Dashboard.tsx`,
matching `*.test.ts(x)`, `src/dev/routes/audio.route.tsx`, `src/dev/routes/dashboard.route.tsx`.
**Never touch:** `src/contracts/**`, other tracks' directories.
**Depends on:** Phase 0 only. (`store.ts` may import `initialSchedulerState` from
`@/engine/scheduler` — that's allowed; don't modify it.)

## Persistence — `store.ts`

Keep `emptySave()` and `createSaveStore()` exports and the `SaveStore` interface.

- One versioned `localStorage` key (`SAVE_KEY`), value is `JSON.stringify(SaveData)`.
- `migrate(raw)`: real implementation. Validate shape; fill missing fields from `emptySave()`;
  bump old `schemaVersion`s forward. **Never throws** — worst case returns a fresh save.
  Write it now even though we're at v1 (add a `// v1 -> v2` seam).
- `load()` runs `migrate` on whatever is in storage. `save(data)` writes through
  (wrap in try/catch for private-mode / quota; keep an in-memory copy).
- `exportJSON()` pretty-prints. `importJSON(str)` replaces the save, returns `false` on bad
  input. `reset()` → `emptySave()`.
- Guard every `localStorage` access in try/catch.

## Audio — `sounds.ts`

Keep `createAudioBus({ muted? })`. Real Web Audio, oscillator-synthesized, **no files**:

| Sound | Character |
| --- | --- |
| `correct` | short rising two-note chime |
| `fluent` | the chime + a sparkle overtone — **audibly better than `correct`** |
| `wrong` | soft neutral low tone. **Not a buzzer.** |
| `hatch` | ascending arpeggio |
| `tap`, `footstep`, `doorOpen`, `chew` | small texture, short |

Lazily create the `AudioContext` on first `play()` (needs a user gesture); resume if
suspended. `setMuted` / `isMuted` respected everywhere; mute state is persisted by Phase 2
via settings, not here.

## Parent dashboard — `Dashboard.tsx`

`DashboardProps { save, onExport, onReset, onClose }`. (The long-press + gate to *reach* it
is Phase 2; build the panel assuming it's already unlocked.)

- **12×12 heatmap**, cell coloured by `FactState.box` (0–5), each cell showing mean of
  `recentLatencies` (or `lastLatencyMs`). Rows/cols 1–12.
- **Ten slowest facts right now** — by rolling-mean latency among introduced facts.
- **Questions answered & minutes practised per day, last 14 days** — derive from
  `save.sessions` (`entries.length`, `endedAt - startedAt`). Small bar chart, inline SVG.
- **Accuracy trend** — correct / total per day, last 14 days. Line, inline SVG.
- **Export** (→ `onExport`) and **Reset** (→ `onReset`, with a confirm).

Use `tierOf` / `isHardCore` / `TIER_NAMES` from `@/contracts` for labelling if useful.
No chart library — inline SVG.

## Acceptance tests — all must pass

- `save` then `load` round-trips a `SaveData` exactly.
- `migrate` on `{}`, on `null`, on a partial object, and on a bad-JSON-derived value all
  return a valid `SaveData` without throwing.
- `migrate` preserves known fields from a current-schema blob.
- `importJSON(exportJSON())` is a no-op round-trip; `importJSON('garbage')` returns false.
- `AudioBus.play` while muted produces no `AudioContext` activity; `setMuted(false)` restores.
- `Dashboard` renders all four sections against a fixture save with ≥ 3 days of sessions and
  no `NaN` in the DOM.

## Dev routes

`#/dev/audio`: one button per `SoundName` (stubbed — wire to the real bus).
`#/dev/dashboard`: `Dashboard` against a **generated fixture** — write a small fixture
builder (in the route file or a `__fixtures__` helper under `src/parent/`) that fills
`facts` with varied boxes/latencies and `sessions` with ~14 days of history.

## DoD

typecheck / lint / test / build green; both dev routes work; only Track E files touched;
`// STUB` headers gone from `store.ts`, `sounds.ts`, `Dashboard.tsx`.
