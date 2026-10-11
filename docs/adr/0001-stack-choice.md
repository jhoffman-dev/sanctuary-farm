# ADR-0001: Stack — TypeScript / React / react-three-fiber

- **Status:** accepted — **engine choice superseded by ADR-0006** (2026-10-11)
- **Date:** 2026-08-31
- **Deciders:** James (sole developer, working with AI agents)

> **Superseded by ADR-0006 (engine part).** On 2026-10-11 the game moved to
> **Godot 4.7 (GDScript)** in `game/`, so James can build the world in an
> editor. The React / react-three-fiber choice below stands only for `apps/web`
> until it is retired at parity (SF-96). What is *not* superseded: web as the
> primary target, Firebase (and ADR-0002), and "free, ad-free, PII-free via a
> link". The text below is kept as decided.

## Context

The prototype (built in ~10 hours) proved the game concept. The vision has since
grown well past it: a 2.5D Animal-Crossing-style farm, real character walk cycles,
a Roblox-style character creator, fantasy animals, async multiplayer (kids visit
farms), curriculum expansions beyond multiplication, and a hosted, **free,
ad-free, PII-free** product that any kid can open from a link — ideally one a
teacher can hand to a class.

Constraints that shaped the call:

- **Solo developer + AI agents.** Rewrite cost is near zero (agents regenerate
  ~500 lines of engine logic in under an hour). Timelines are AI-speed: months,
  not years.
- **Distribution is the top value.** Works on a Chromebook, an old iPad, a
  library PC — via a URL, no install, no app store, no account gate.
- **The developer is fluent in C# and TypeScript and enjoys Unity**, so language
  was not a deciding factor.

## Decision

Build the game on **TypeScript + React 19 + react-three-fiber (Three.js)**,
Tailwind for 2D UI, Vitest for tests. Firebase for hosting, auth, and the
save/multiplayer backend (see ADR-0002). Package the mobile app later with
Capacitor if app-store presence is wanted; the web build is the primary target.

## Alternatives considered

- **Unity (C#).** Best-in-class visual tooling, Asset Store leverage, native
  mobile performance, and the developer enjoys it. Rejected primarily on
  **distribution**: Unity WebGL is a heavy download with weaker mobile-web
  robustness, and going native trades away "open a link on any device." Secondary:
  the AI-agent loop is tighter on web (agents author + test + screenshot in a
  fast text loop; Unity keeps scene/prefab/animation work in the editor).
- **Godot 4 (C#).** Lighter web export than Unity, open-source (fits the free
  ethos), C# works. Rejected: smaller asset ecosystem, smaller community, and AI
  agents have far less Godot training data than web or Unity.
- **Flutter + Flame.** One codebase for web + mobile, but another language
  (Dart), Flame is less mature, and 2.5D/3D is weak.

## Consequences

- **Positive:** every kid reachable via a link; the tightest AI-agent build loop;
  keeps the developer's strongest language; static hosting cost ≈ $0; the 2D math
  UI stays in React where it is already good.
- **Cost / risk:** three.js gives a capable *runtime* but not Unity's turnkey
  authoring — no built-in visual scene editor, no Animator state machine, no
  humanoid retargeting. Mitigations: commit to **one coherent asset pack**
  (Kenney free, or Synty paid) rather than mixing sources; do layout in **Blender**
  or a small **custom in-app editor** (ticket); buy **pre-animated** character and
  quadruped assets (Mixamo / Quaternius) so no animation authoring is needed;
  write the animation state logic in code (~small for a farm move set).
- **Follow-ups:** spike the r3f character controller + walk/idle blend; decide the
  layout tooling; decide the asset pack; set a performance budget and test on the
  oldest device we support.
