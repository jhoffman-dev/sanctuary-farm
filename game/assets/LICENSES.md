# Asset and add-on licences — Godot client

## Kenney models (`assets/kenney/`)

Every model under `kenney/` is a Kenney GLB, copied **unmodified** from
`apps/web/public/models/kenney/` (itself copied unmodified from each kit's
`Models/GLB format/` folder) together with that folder's
`Textures/colormap.png` and the kit's own `License.txt`. No format conversion,
no re-encoding (ADR-0003, addendum of 2026-10-08; ADR-0006). The byte-for-byte
copy was checked with `diff -r` on 2026-10-11.

The `.import` files beside them are Godot's import settings and are committed;
the imported data itself lives in `.godot/` and is not. The six `colormap.png`
atlases are pinned to lossless import (`detect_3d/compress_to=0`), so Godot never
block-compresses the palette colours art-direction §3 measures.

All kits are by Kenney (<https://www.kenney.nl>), licensed
[CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/). Credit is not
required; we give it anyway. Downloaded 2026-10-07 from each kit's page.

| Folder | Kit | Version (`License.txt` creation date) | Source | Files |
| --- | --- | --- | --- | --- |
| `kenney/cube-pets/` | Cube Pets | 2.0 (26-03-2026) | <https://kenney.nl/assets/cube-pets> | `animal-cow`, `animal-pig`, `animal-hog`, `animal-chick`, `animal-bunny`, `animal-dog` |
| `kenney/mini-characters/` | Mini Characters | 1.0 (17-07-2024) | <https://kenney.nl/assets/mini-characters> | `character-female-a`, `character-female-c`, `character-male-a`, `character-male-c` |
| `kenney/fantasy-town-kit/` | Fantasy Town Kit | 2.0 (03-08-2025) | <https://kenney.nl/assets/fantasy-town-kit> | `road`, `fence`, `fence-curved`, `fence-gate`, `wall-wood`, `wall-wood-door`, `wall-wood-window-shutters`, `wall-wood-doorway-square-wide`, `roof-gable`, `tree`, `tree-high`, `fountain-center`, `stall-bench` |
| `kenney/survival-kit/` | Survival Kit | 2.0 (03-04-2024) | <https://kenney.nl/assets/survival-kit> | `barrel`, `box`, `box-large`, `rock-a`, `signpost` |
| `kenney/mini-forest/` | Mini Forest | 1.0 (14-07-2026) | <https://kenney.nl/assets/mini-forest> | `patch-grass`, `patch-dirt`, `plant` |
| `kenney/food-kit/` | Food Kit | 2.0 (26-06-2024) | <https://kenney.nl/assets/food-kit> | `cabbage`, `bag`, `egg` |

## GUT test framework (`addons/gut/`)

[GUT](https://github.com/bitwes/Gut) **9.7.1** (tag `v9.7.1`, commit
`aeb5d4f3f7f0a6c9b5e178876d6c99b791fda605`), the release that adds Godot 4.7
compatibility. Vendored unmodified from the tag's source archive
(`Gut-9.7.1.tar.gz`, SHA-256
`6da99c4e9228d9bec3fb4bd1730a487770a989f0f511dac82a2897a964613385`), `addons/gut/`
only. MIT licence — `addons/gut/LICENSE.md`. Editor and test use only: the web
export excludes `addons/gut/*` and `tests/*` (`export_presets.cfg`).
