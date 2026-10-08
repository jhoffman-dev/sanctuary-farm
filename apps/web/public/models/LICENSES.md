# Model licences

Every model under `kenney/` is a Kenney GLB, copied **unmodified** from the kit's
`Models/GLB format/` folder together with that folder's `Textures/colormap.png`
(the GLBs reference it by relative URI) and the kit's own `License.txt`. No format
conversion, no re-encoding (ADR-0003, addendum of 2026-10-08).

All kits are by Kenney (<https://www.kenney.nl>), licensed
[CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/). Credit is not
required; we give it anyway. Downloaded 2026-10-07 from each kit's page.

| Folder | Kit | Version (`License.txt` creation date) | Source | Files used |
| --- | --- | --- | --- | --- |
| `kenney/cube-pets/` | Cube Pets | 2.0 (26-03-2026) | <https://kenney.nl/assets/cube-pets> | `animal-cow`, `animal-pig`, `animal-hog`, `animal-chick`, `animal-bunny`, `animal-dog` |
| `kenney/mini-characters/` | Mini Characters | 1.0 (17-07-2024) | <https://kenney.nl/assets/mini-characters> | `character-female-a`, `character-female-c`, `character-male-a`, `character-male-c` |
| `kenney/fantasy-town-kit/` | Fantasy Town Kit | 2.0 (03-08-2025) | <https://kenney.nl/assets/fantasy-town-kit> | `road`, `fence`, `fence-curved`, `fence-gate`, `wall-wood`, `wall-wood-door`, `wall-wood-window-shutters`, `wall-wood-doorway-square-wide`, `roof-gable`, `tree`, `tree-high`, `fountain-center`, `stall-bench` |
| `kenney/survival-kit/` | Survival Kit | 2.0 (03-04-2024) | <https://kenney.nl/assets/survival-kit> | `barrel`, `box`, `box-large`, `rock-a`, `signpost` |
| `kenney/mini-forest/` | Mini Forest | 1.0 (14-07-2026) | <https://kenney.nl/assets/mini-forest> | `patch-grass`, `patch-dirt`, `plant` |
| `kenney/food-kit/` | Food Kit | 2.0 (26-06-2024) | <https://kenney.nl/assets/food-kit> | `cabbage`, `bag`, `egg` |

Which piece each file draws is `apps/web/src/world-assets/kenney-catalogue.ts`.
