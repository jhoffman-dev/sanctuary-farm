/**
 * Kenney names clips three ways (ADR-0004): `idle` on Cube Pets and Mini
 * Characters, `Idle` elsewhere, `CharacterArmature|Idle` on armature exports.
 * Art-direction §8 calls it `idle`; this finds it under any of those names.
 */
export function findIdleClip<Clip extends { readonly name: string }>(clips: readonly Clip[]): Clip | undefined {
  return clips.find((clip) => /(^|\|)idle$/i.test(clip.name))
}
