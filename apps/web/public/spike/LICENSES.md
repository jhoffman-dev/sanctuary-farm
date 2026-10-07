# Spike assets — sources and licences

Throwaway assets for the SF-63 / SF-64 spike (`?spike=3d`). They are **not** the
shipped asset set; art-direction §8 puts production models under
`apps/web/public/models/` with their own `LICENSES.md`.

All three come from **Quaternius** (Tomás Laulhé, `laulhet@gmail.com`),
downloaded **2026-09-08** from the Google Drive folders linked off the pack pages
on <https://quaternius.com>.

| File | Model | Pack | Pack page | Download folder |
| --- | --- | --- | --- | --- |
| `keeper.glb` | `Farmer.gltf` (Individual Characters → glTF) | Ultimate Modular Men Pack — Feb 2022 | <https://quaternius.com/packs/ultimatemodularcharacters.html> | `https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX` |
| `cow.glb` | `Cow.gltf` (glTF) | Ultimate Animated Animal Pack — July 2021 | <https://quaternius.com/packs/ultimateanimatedanimals.html> | `https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk` |
| `horse.glb` | `Horse.gltf` (glTF) | Ultimate Animated Animal Pack — July 2021 | same as above | same as above |

`chicken.glb` is the exception and is deliberately from a **different Quaternius
line** — the chunky, big-headed one that art-direction §3 actually describes. It
is in the spike as the style comparison, not as a candidate asset:

| File | Model | Source | Licence shown |
| --- | --- | --- | --- |
| `chicken.glb` | "Chicken" by Quaternius, dated 23 Oct 2022, tagged Animated | poly.pizza mirror <https://poly.pizza/m/ineV9pU5VL> → `https://static.poly.pizza/a0001762-9352-48c3-9abd-be91e42db114.glb` | Public Domain (CC0), author Quaternius |

Two caveats recorded in ADR-0003: this model is **not in any pack listed on
quaternius.com**, and the mirror's conversion mangled its base colours (body
`baseColorFactor` 0.289 linear — mid grey — where the vendor's own render is
white) and left `metallicFactor` at 0.4. That is why it renders grey in the
screenshots.

## Licence

Both pack pages carry a **CC0** badge linking
<https://creativecommons.org/publicdomain/zero/1.0/>, and that is the licence
under which these files were obtained on 2026-09-08.

Since **2026-08-28** the site-wide licence page
(<https://quaternius.com/license.html>) publishes the **Quaternius Asset Licence
(QAL) v1.0** instead. Its own §7 says a change "will not apply retroactively to
Assets you've already obtained under an earlier version", but the two statements
now disagree on the same page set. See ADR-0003 — this is an open question for
James, not a settled fact.

QAL v1.0, in short: free use in personal, educational and commercial projects,
no attribution required; you may not "extract, repackage, sublicense, sell, or
otherwise redistribute the Assets (in original or modified form) as a standalone
asset, asset pack, stock file, template, or similar product". Shipping them
inside the built game is explicitly allowed by §2/§3(a); committing them to a
**public** repo as loose `.glb` files is the case to check.

## What was done to them

Source `.gltf` (single file, embedded buffers) → `.glb`, by:

1. Dropping every animation clip except the ones the spike plays
   (`Idle`, `Walk`, `Wave` for the keeper; `Idle`, `Walk`, `Eating` for the
   animals) — Quaternius ships 13–24 clips per model, mostly combat.
2. `npx @gltf-transform/cli@4.5.0 optimize <in> <out> --compress meshopt
   --texture-compress false --simplify false`, which also ran `palette`
   (8 flat materials → 1 material + one 4×4-ish palette texture), `dedup`,
   `weld`, `resample` and `prune`.

Result: 3.1 MB / 3.6 MB / 3.0 MB of `.gltf` → 169 kB / 186 kB / 249 kB of `.glb`.
Geometry is meshopt-compressed, so the loader must call
`setMeshoptDecoder(MeshoptDecoder)` (see `src/spike/use-animated-gltf.ts`).

`chicken.glb` took a shorter path — `gltf-transform meshopt` only (140 kB →
42 kB), then `metallicFactor` set to 0 on every material. The `palette` pass in
`optimize` turned its five flat colours to mud, and at `metallicFactor` 0.4 a
scene with no environment map renders it near-black.

## `kenney/` — Kenney Cube Pets + Mini Characters (ADR-0003 correction)

Added 2026-10-07 for the 64-px silhouette test (`?spike=3d&pack=kenney`,
`e2e/spike-kenney.spec.ts`). Downloaded **2026-10-07** from kenney.nl.

| File | Source model | Pack (version, creation date) | Pack page | Download |
| --- | --- | --- | --- | --- |
| `kenney/animal-cow.glb` | `Models/GLB format/animal-cow.glb` | Cube Pets (2.0), 26-03-2026 | <https://kenney.nl/assets/cube-pets> | `https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip` |
| `kenney/animal-pig.glb` | `Models/GLB format/animal-pig.glb` | same | same | same |
| `kenney/animal-hog.glb` | `Models/GLB format/animal-hog.glb` | same | same | same |
| `kenney/animal-chick.glb` | `Models/GLB format/animal-chick.glb` | same | same | same |
| `kenney/character-male-a.glb` | `Models/GLB format/character-male-a.glb` | Mini Characters (1.0), 17-07-2024 | <https://kenney.nl/assets/mini-characters> | `https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip` |

Licence, quoted from each pack's `License.txt`:

> License: (Creative Commons Zero, CC0)
> http://creativecommons.org/publicdomain/zero/1.0/
>
> You can use this content for personal, educational, and commercial purposes.
>
> Support by crediting 'Kenney' or 'www.kenney.nl' (this is not a requirement)

What was done to them: `npx @gltf-transform/cli@4.5.0 optimize <in> <out>
--compress meshopt --texture-compress false --simplify false` — the same step
as the Quaternius files. Each source `.glb` references its pack's shared
`Textures/colormap.png` (512 × 512) by URI; `optimize` embeds that atlas into
every output, so each `.glb` carries its own copy (49–52 kB per animal,
70 kB for the keeper). Every clip is kept; `metallicFactor` is already 0.
