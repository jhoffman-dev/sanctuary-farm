# Agent memory — index

Durable, cross-agent notes. One file per topic. Read this index at the start of
every task; open the files relevant to what you're touching. Append a note when
you learn something the next agent will need (a gotcha, a non-obvious constraint,
a decision that isn't yet an ADR). **Not** for transient task state.

Bigger stuff belongs elsewhere: product intent → `docs/PRD.md`, architecture →
`docs/architecture.md`, reversible-but-notable decisions → `docs/adr/`.

## Notes

- [environment.md](environment.md) — local toolchain quirks (Node via Homebrew, CLIs, auth state).
- [monorepo-gotchas.md](monorepo-gotchas.md) — traps in the rebuilt monorepo (scheduler state fields, vitest coverage, oxlint, worktree Bash guard, saves).
- [prototype-gotchas.md](prototype-gotchas.md) — lessons from the retired `src/` prototype (file refs are historical).
- [world-layout.md](world-layout.md) — `@sf/world`: where `farm.json` lives, the parser contract, the art-direction rules it enforces, and the keeper-speed constant.
- [farm-game-facade.md](farm-game-facade.md) — `createFarmGame` contract gotchas: rounds stay active until `endRound`, latency is measured here, progress semantics.
- [3d-assets-and-r3f.md](3d-assets-and-r3f.md) — from the SF-63/64 spikes: Quaternius' licence change and download route, the glTF pipeline (`gltf-transform`, meshopt, `metallicFactor`), why draw calls bite before triangles, testing r3f without WebGL.
