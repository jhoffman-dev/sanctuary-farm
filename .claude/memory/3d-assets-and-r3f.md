# 3D assets and r3f (from the SF-63 / SF-64 spikes, 2026-09-08)

Hard-won details from the Phase 2 spikes. Decisions live in `docs/adr/0003-asset-pack.md`
and `docs/adr/0004-3d-foundation.md`; this is the stuff that wastes an afternoon
if you rediscover it.

- **Quaternius' licence moved.** Pack pages still badge **CC0**; the site licence
  page (`quaternius.com/license.html`, updated 2026-08-28) now publishes the
  **Quaternius Asset Licence v1.0**. Shipping inside a build is fine under both;
  committing loose `.glb`s to a *public* repo is the case to re-check.
- **Quaternius downloads are Google Drive folders**, not direct links. The pack
  page's `onclick` holds the folder id; a folder's HTML embeds its children's
  ids; a file downloads from
  `https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t`
  (use `curl -J` — the filename only arrives in `Content-Disposition`).
- **Quaternius ships two incompatible styles.** Naturalistic (Ultimate Animated
  Animals, Farm Animal Pack) and chunky big-head. Art-direction §3 describes the
  chunky one; the packs listed on the site are the naturalistic one. Do not mix —
  it is visible in one frame.
- **Do not source glTF from poly.pizza or any mirror.** Its conversion of the
  Quaternius chicken came out with `baseColorFactor` 0.289 (mid grey; the
  vendor's own render is white) and `metallicFactor` 0.4. Take the vendor's own
  glTF export.
- **`metallicFactor` must be 0 for a flat-shaded pack.** With one directional +
  one hemisphere light and no environment map, any metalness renders near-black.
- **`gltf-transform optimize --compress meshopt` is worth ~93 %** (3.1 MB `.gltf`
  → 169 kB `.glb`), *after* deleting the clips you do not play — Quaternius ships
  13–24 per model. Its `palette` pass folds many flat materials into one material
  plus a tiny texture, which is the atlas art-direction §3 wants, for free. It
  wrecked the poly.pizza chicken's colours, though — run plain `meshopt` when
  `palette` misbehaves. Meshopt output needs `loader.setMeshoptDecoder(...)`.
- **Draw calls, not triangles, are the 3D budget we hit first.** Every skinned
  primitive is its own call and the shadow pass doubles the count: four
  characters and a ground plane cost 65 calls but only 26 k triangles.
  `gltf-transform join` will not merge skinned primitives.
- **Quaternius models are not 1 unit = 1 m.** Measure a `Box3` on load and scale
  to the art-direction height; do not hand-tune per model.
- **Clip names differ per pack** — `Idle`/`Walk`/`Eating`, `Idle`/`Walk`/`Wave`,
  and `CharacterArmature|Idle`. Take clip names as data, not constants.
- **jsdom has no WebGL**, so r3f components cannot be unit-tested. Keep the maths
  in pure modules (see `apps/web/src/spike/steering.ts` on the spike branch) and
  let Playwright cover the components. Publishing `renderer.info` onto a DOM
  node's `data-*` attributes at ~5 Hz is how a Playwright spec reads a scene.
- **Mixamo is unusable by an agent** — it needs an Adobe sign-in. Pick characters
  that already carry idle + walk.
- **Portrait is not solved.** At 360 × 640 with FOV 35 vertical, the art-direction
  §2 camera crops models off the sides.
