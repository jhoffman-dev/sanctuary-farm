# Notion ticket → GitHub issue map

On 2026-10-04 the ticket board moved from Notion to GitHub Issues + the
"Sanctuary Farm Project" GitHub Project (see `docs/board.md`). Every Notion
ticket became one issue: **issue number = SF number + 29**. This table keeps old
`SF-n` references in commits, branches and PRs resolvable. Each issue body also
links its original Notion page. New tickets continue the numbering (`SF-81`…)
in the issue title and do not appear here.

Generated from `gh issue list -R jhoffman-dev/sanctuary-farm --state all --limit 200 --json number,title,state,body`
("state at migration" is the Notion Status recorded in each issue's provenance line).

| SF | Issue | Title | State at migration |
| --- | --- | --- | --- |
| SF-1 | [#30](https://github.com/jhoffman-dev/sanctuary-farm/issues/30) | Phase 0 — Project foundation | In progress (open) |
| SF-2 | [#31](https://github.com/jhoffman-dev/sanctuary-farm/issues/31) | Phase 1 — Clean Architecture refactor | In progress (open) |
| SF-3 | [#32](https://github.com/jhoffman-dev/sanctuary-farm/issues/32) | Phase 2 — 3D rendering foundation | Backlog (open) |
| SF-4 | [#33](https://github.com/jhoffman-dev/sanctuary-farm/issues/33) | Phase 3 — Alpha parity in 3D | Backlog (open) |
| SF-5 | [#34](https://github.com/jhoffman-dev/sanctuary-farm/issues/34) | Phase 4 — Cloud save and identity | Backlog (open) |
| SF-6 | [#35](https://github.com/jhoffman-dev/sanctuary-farm/issues/35) | Phase 5 — Polish and launch | Backlog (open) |
| SF-7 | [#36](https://github.com/jhoffman-dev/sanctuary-farm/issues/36) | Phase 6+ — Expansions | Backlog (open) |
| SF-8 | [#37](https://github.com/jhoffman-dev/sanctuary-farm/issues/37) | Install gh / firebase-tools / pnpm CLIs | Done (closed) |
| SF-9 | [#38](https://github.com/jhoffman-dev/sanctuary-farm/issues/38) | Write the PRD | Done (closed) |
| SF-10 | [#39](https://github.com/jhoffman-dev/sanctuary-farm/issues/39) | Write the architecture spec | Done (closed) |
| SF-11 | [#40](https://github.com/jhoffman-dev/sanctuary-farm/issues/40) | Write the implementation plan | Done (closed) |
| SF-12 | [#41](https://github.com/jhoffman-dev/sanctuary-farm/issues/41) | Rewrite CLAUDE.md for architecture / clean code / testing | Done (closed) |
| SF-13 | [#42](https://github.com/jhoffman-dev/sanctuary-farm/issues/42) | ADR-0001 — stack choice | Done (closed) |
| SF-14 | [#43](https://github.com/jhoffman-dev/sanctuary-farm/issues/43) | ADR-0002 — identity and save | Done (closed) |
| SF-15 | [#44](https://github.com/jhoffman-dev/sanctuary-farm/issues/44) | Write the six agent definitions | Done (closed) |
| SF-16 | [#45](https://github.com/jhoffman-dev/sanctuary-farm/issues/45) | Write the core skills | Done (closed) |
| SF-17 | [#46](https://github.com/jhoffman-dev/sanctuary-farm/issues/46) | Set up the agent memory convention | Done (closed) |
| SF-18 | [#47](https://github.com/jhoffman-dev/sanctuary-farm/issues/47) | Notion board schema spec + CLI | Done (closed) |
| SF-19 | [#48](https://github.com/jhoffman-dev/sanctuary-farm/issues/48) | Docs-to-Notion sync script | Done (closed) |
| SF-20 | [#49](https://github.com/jhoffman-dev/sanctuary-farm/issues/49) | Landing page v0 (static) | Done (closed) |
| SF-21 | [#50](https://github.com/jhoffman-dev/sanctuary-farm/issues/50) | Refresh the README | Done (closed) |
| SF-22 | [#51](https://github.com/jhoffman-dev/sanctuary-farm/issues/51) | gitignore for secrets and monorepo | Done (closed) |
| SF-23 | [#52](https://github.com/jhoffman-dev/sanctuary-farm/issues/52) | GitHub: auth and create the repo | Done (closed) |
| SF-24 | [#53](https://github.com/jhoffman-dev/sanctuary-farm/issues/53) | Decide repository visibility (public vs private) | Later (open) |
| SF-25 | [#54](https://github.com/jhoffman-dev/sanctuary-farm/issues/54) | Choose a license and add LICENSE | Later (open) |
| SF-26 | [#55](https://github.com/jhoffman-dev/sanctuary-farm/issues/55) | Notion: create integration, share DB + a Docs page, add credentials | Done (closed) |
| SF-27 | [#56](https://github.com/jhoffman-dev/sanctuary-farm/issues/56) | Notion: build the board and import the backlog | Done (closed) |
| SF-28 | [#57](https://github.com/jhoffman-dev/sanctuary-farm/issues/57) | Notion: push the docs and verify the sync | Done (closed) |
| SF-29 | [#58](https://github.com/jhoffman-dev/sanctuary-farm/issues/58) | Firebase: auth and create the project | Ready (open) |
| SF-30 | [#59](https://github.com/jhoffman-dev/sanctuary-farm/issues/59) | Decide GitHub Project vs Notion-only board | Done (closed) |
| SF-31 | [#60](https://github.com/jhoffman-dev/sanctuary-farm/issues/60) | Decide analytics stance | Ready (open) |
| SF-32 | [#61](https://github.com/jhoffman-dev/sanctuary-farm/issues/61) | Decide error monitoring | Later (open) |
| SF-33 | [#62](https://github.com/jhoffman-dev/sanctuary-farm/issues/62) | Decide a domain name | Done (closed) |
| SF-34 | [#63](https://github.com/jhoffman-dev/sanctuary-farm/issues/63) | Provide a low-end test device for QA | Backlog (open) |
| SF-35 | [#64](https://github.com/jhoffman-dev/sanctuary-farm/issues/64) | Privacy notice legal sanity-check | Backlog (open) |
| SF-36 | [#65](https://github.com/jhoffman-dev/sanctuary-farm/issues/65) | pnpm workspace skeleton | Done (closed) |
| SF-37 | [#66](https://github.com/jhoffman-dev/sanctuary-farm/issues/66) | Import-boundary lint rules (dependency-cruiser) | Done (closed) |
| SF-38 | [#67](https://github.com/jhoffman-dev/sanctuary-farm/issues/67) | Pin Node and editor config | Done (closed) |
| SF-39 | [#68](https://github.com/jhoffman-dev/sanctuary-farm/issues/68) | GitHub Actions CI workflow | Blocked (open) |
| SF-40 | [#69](https://github.com/jhoffman-dev/sanctuary-farm/issues/69) | GitHub branch protection on main | Backlog (open) |
| SF-41 | [#70](https://github.com/jhoffman-dev/sanctuary-farm/issues/70) | firebase.json and emulator config | Done (closed) |
| SF-42 | [#71](https://github.com/jhoffman-dev/sanctuary-farm/issues/71) | PR preview deploy workflow | Backlog (open) |
| SF-43 | [#72](https://github.com/jhoffman-dev/sanctuary-farm/issues/72) | Secrets management doc for agents | Done (closed) |
| SF-44 | [#73](https://github.com/jhoffman-dev/sanctuary-farm/issues/73) | PR template | Done (closed) |
| SF-45 | [#74](https://github.com/jhoffman-dev/sanctuary-farm/issues/74) | Dependency update config | Done (closed) |
| SF-46 | [#75](https://github.com/jhoffman-dev/sanctuary-farm/issues/75) | CONTRIBUTING and CODE_OF_CONDUCT | In review (open) |
| SF-47 | [#76](https://github.com/jhoffman-dev/sanctuary-farm/issues/76) | Definition of Done doc | Done (closed) |
| SF-48 | [#77](https://github.com/jhoffman-dev/sanctuary-farm/issues/77) | Curriculum design doc | Done (closed) |
| SF-49 | [#78](https://github.com/jhoffman-dev/sanctuary-farm/issues/78) | Accessibility standard doc | Done (closed) |
| SF-50 | [#79](https://github.com/jhoffman-dev/sanctuary-farm/issues/79) | Performance budget doc | Done (closed) |
| SF-51 | [#80](https://github.com/jhoffman-dev/sanctuary-farm/issues/80) | Kid-safety threat model | Done (closed) |
| SF-52 | [#81](https://github.com/jhoffman-dev/sanctuary-farm/issues/81) | Art direction / style guide doc | Done (closed) |
| SF-53 | [#82](https://github.com/jhoffman-dev/sanctuary-farm/issues/82) | Sound design approach doc | Done (closed) |
| SF-54 | [#83](https://github.com/jhoffman-dev/sanctuary-farm/issues/83) | Privacy notice draft | Done (closed) |
| SF-55 | [#84](https://github.com/jhoffman-dev/sanctuary-farm/issues/84) | Firestore backup strategy doc | Done (closed) |
| SF-56 | [#85](https://github.com/jhoffman-dev/sanctuary-farm/issues/85) | Landing: favicon, social meta, OG image | Done (closed) |
| SF-57 | [#86](https://github.com/jhoffman-dev/sanctuary-farm/issues/86) | Landing: verify in browser and deploy | Blocked (open) |
| SF-58 | [#87](https://github.com/jhoffman-dev/sanctuary-farm/issues/87) | Extract @sf/domain from the prototype | Done (closed) |
| SF-59 | [#88](https://github.com/jhoffman-dev/sanctuary-farm/issues/88) | Define @sf/application use-cases and ports | Done (closed) |
| SF-60 | [#89](https://github.com/jhoffman-dev/sanctuary-farm/issues/89) | apps/web: new React + r3f shell wired to @sf/application | Done (closed) |
| SF-61 | [#90](https://github.com/jhoffman-dev/sanctuary-farm/issues/90) | localStorage SaveStore adapter | Done (closed) |
| SF-62 | [#91](https://github.com/jhoffman-dev/sanctuary-farm/issues/91) | Web Audio AudioBus adapter | Done (closed) |
| SF-63 | [#92](https://github.com/jhoffman-dev/sanctuary-farm/issues/92) | Spike: r3f character controller | In review (open) |
| SF-64 | [#93](https://github.com/jhoffman-dev/sanctuary-farm/issues/93) | Spike: asset pack decision | In review (open) |
| SF-65 | [#94](https://github.com/jhoffman-dev/sanctuary-farm/issues/94) | Spike: world layout tooling decision | In review (open) |
| SF-66 | [#95](https://github.com/jhoffman-dev/sanctuary-farm/issues/95) | Landing v1 | Backlog (open) |
| SF-67 | [#96](https://github.com/jhoffman-dev/sanctuary-farm/issues/96) | Teacher feedback form | Backlog (open) |
| SF-68 | [#97](https://github.com/jhoffman-dev/sanctuary-farm/issues/97) | PWA / add-to-home-screen | Backlog (open) |
| SF-69 | [#98](https://github.com/jhoffman-dev/sanctuary-farm/issues/98) | Accessibility pass | Backlog (open) |
| SF-70 | [#99](https://github.com/jhoffman-dev/sanctuary-farm/issues/99) | Playtest with the target user | Backlog (open) |
| SF-71 | [#100](https://github.com/jhoffman-dev/sanctuary-farm/issues/100) | Decide the tier-6 rule: "The 12s" holds only 11×12 | Ready (open) |
| SF-72 | [#101](https://github.com/jhoffman-dev/sanctuary-farm/issues/101) | Game favicon is the wheat emoji while the app icon is the barn+chick | In review (open) |
| SF-73 | [#102](https://github.com/jhoffman-dev/sanctuary-farm/issues/102) | Code-split Three.js out of the initial apps/web bundle | In review (open) |
| SF-74 | [#103](https://github.com/jhoffman-dev/sanctuary-farm/issues/103) | @sf/world: layout schema, parser and farm.json v1 | In review (open) |
| SF-75 | [#104](https://github.com/jhoffman-dev/sanctuary-farm/issues/104) | FarmScene renders from the world layout | Backlog (open) |
| SF-76 | [#105](https://github.com/jhoffman-dev/sanctuary-farm/issues/105) | Dev-only layout tweak mode (?layout=edit) | Backlog (open) |
| SF-77 | [#106](https://github.com/jhoffman-dev/sanctuary-farm/issues/106) | Keeper movement: obstacle avoidance over the layout (pathfinding v1) | Backlog (open) |
| SF-78 | [#107](https://github.com/jhoffman-dev/sanctuary-farm/issues/107) | Decide: landscape-only, or must portrait frame the whole farm? | Ready (open) |
| SF-79 | [#108](https://github.com/jhoffman-dev/sanctuary-farm/issues/108) | Draw-call budget: shadow-caster culling and fewer material slots | Backlog (open) |
| SF-80 | [#109](https://github.com/jhoffman-dev/sanctuary-farm/issues/109) | Performance-budget guards: DPR cap, demand frameloop, quality-tier probe, size-limit, Lighthouse CI | Backlog (open) |
