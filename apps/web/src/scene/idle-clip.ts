/**
 * Kenney names clips three ways (ADR-0004): `idle` on Cube Pets and Mini
 * Characters, `Idle` elsewhere, `CharacterArmature|Idle` on armature exports.
 * Art-direction §8 calls them `idle` and `walk`; this finds them under any of
 * those names.
 */
export function findClipNamed<Clip extends { readonly name: string }>(
  clips: readonly Clip[],
  name: 'idle' | 'walk',
): Clip | undefined {
  const pattern = new RegExp(`(^|\\|)${name}$`, 'i')
  return clips.find((clip) => pattern.test(clip.name))
}

export function findIdleClip<Clip extends { readonly name: string }>(clips: readonly Clip[]): Clip | undefined {
  return findClipNamed(clips, 'idle')
}
