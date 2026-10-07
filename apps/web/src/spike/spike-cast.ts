import { SCREEN_TO_WORLD_YAW } from './camera-rig'
import type { LocomotionClip } from './steering'

/**
 * Which models the spike puts on the grass. Two packs are compared — the
 * original Quaternius set (ADR-0004) and Kenney's Cube Pets + Mini Characters
 * (the ADR-0003 correction) — so the cast is data, not JSX.
 */

export type GrazerCast = {
  url: string
  /** Capitalised: it becomes `data-silhouette-<name>` on the readout. */
  name: string
  targetHeight: number
  position: [number, number, number]
  rotationY: number
  /** Offset into the idle/eat loop so two animals are not in lockstep. */
  phaseSeconds: number
  /** Clip names as the model file spells them. */
  clips: { resting: string; busy: string }
}

export type KeeperCast = {
  url: string
  targetHeight: number
  /** The model's own spelling of the two locomotion clips. */
  clips: Readonly<Record<LocomotionClip, string>>
}

export type SpikeCast = { keeper: KeeperCast; grazers: readonly GrazerCast[] }

export type PackName = 'quaternius' | 'kenney'

/** Art-direction §2 scale rule: keeper 1.6, cow 1.3, sheep / pig 0.9, chicken 0.5. */
export const WORLD_HEIGHT = { keeper: 1.6, cow: 1.3, horse: 1.5, pig: 0.9, chicken: 0.5 } as const

const NATURALISTIC_CLIPS = { resting: 'Idle', busy: 'Eating' } as const
/** The chunky "cute" Quaternius line prefixes every clip with its armature's name. */
const CUTE_CLIPS = { resting: 'CharacterArmature|Idle', busy: 'CharacterArmature|Walk' } as const
/** Kenney spells every clip in lower case, already matching art-direction §8. */
const KENNEY_CLIPS = { resting: 'idle', busy: 'eat' } as const

const QUATERNIUS: SpikeCast = {
  keeper: { url: '/spike/keeper.glb', targetHeight: WORLD_HEIGHT.keeper, clips: { Idle: 'Idle', Walk: 'Walk' } },
  grazers: [
    { url: '/spike/cow.glb', name: 'Cow', targetHeight: WORLD_HEIGHT.cow, position: [-3.5, 0, -1], rotationY: 1.1, phaseSeconds: 0, clips: NATURALISTIC_CLIPS },
    { url: '/spike/horse.glb', name: 'Horse', targetHeight: WORLD_HEIGHT.horse, position: [3.2, 0, -2.4], rotationY: -0.8, phaseSeconds: 2.5, clips: NATURALISTIC_CLIPS },
    // Deliberately from Quaternius' other, chunky line: the ADR-0003 style
    // comparison is the point of having it in frame.
    { url: '/spike/chicken.glb', name: 'Chicken', targetHeight: WORLD_HEIGHT.chicken, position: [0.9, 0, 1.6], rotationY: -2.2, phaseSeconds: 1.2, clips: CUTE_CLIPS },
  ],
}

const KENNEY: SpikeCast = {
  keeper: { url: '/spike/kenney/character-male-a.glb', targetHeight: WORLD_HEIGHT.keeper, clips: { Idle: 'idle', Walk: 'walk' } },
  grazers: [
    { url: '/spike/kenney/animal-cow.glb', name: 'Cow', targetHeight: WORLD_HEIGHT.cow, position: [-3.5, 0, -1], rotationY: 1.1, phaseSeconds: 0, clips: KENNEY_CLIPS },
    { url: '/spike/kenney/animal-hog.glb', name: 'Hog', targetHeight: WORLD_HEIGHT.pig, position: [3.2, 0, -2.4], rotationY: -0.8, phaseSeconds: 2.5, clips: KENNEY_CLIPS },
    { url: '/spike/kenney/animal-pig.glb', name: 'Pig', targetHeight: WORLD_HEIGHT.pig, position: [-1.6, 0, 2.2], rotationY: 2.4, phaseSeconds: 4.1, clips: KENNEY_CLIPS },
    { url: '/spike/kenney/animal-chick.glb', name: 'Chick', targetHeight: WORLD_HEIGHT.chicken, position: [0.9, 0, 1.6], rotationY: -2.2, phaseSeconds: 1.2, clips: KENNEY_CLIPS },
  ],
}

export const CASTS: Readonly<Record<PackName, SpikeCast>> = { quaternius: QUATERNIUS, kenney: KENNEY }

/** What `?spike=3d&…` asks for: the whole scene, or one model's silhouette. */
export type SpikeRoute =
  | { view: 'scene'; pack: PackName }
  | { view: 'silhouette'; pack: PackName; model: SilhouetteSubject; yaw: number }

/**
 * How far an animal is turned away from the camera for its silhouette. Shape
 * depends on it more than on anything else, so the test measures all three
 * rather than pick the flattering one.
 */
export const SILHOUETTE_TURNS = { headon: 0, 'three-quarter': Math.PI / 4, profile: Math.PI / 2 } as const
export type SilhouetteTurn = keyof typeof SILHOUETTE_TURNS

/**
 * The model yaw that shows a model `turn` away from facing the §2 camera.
 * Both packs author their models facing +Z (checked on the contact sheet), so
 * one formula serves both.
 */
export function silhouetteYaw(turn: SilhouetteTurn): number {
  return SCREEN_TO_WORLD_YAW + SILHOUETTE_TURNS[turn]
}

function turnFrom(value: string | null): SilhouetteTurn {
  if (value === null) return 'three-quarter'
  if (value in SILHOUETTE_TURNS) return value as SilhouetteTurn
  throw new Error(`spike: unknown silhouette turn "${value}" (${Object.keys(SILHOUETTE_TURNS).join(', ')})`)
}

export type SilhouetteSubject = { name: string; url: string; targetHeight: number; restingClip: string }

function packFrom(value: string | null): PackName {
  return value === 'kenney' ? 'kenney' : 'quaternius'
}

/** Every model of a pack that the silhouette view can isolate, keyed by lower-case name. */
export function silhouetteSubjects(pack: PackName): ReadonlyMap<string, SilhouetteSubject> {
  const { keeper, grazers } = CASTS[pack]
  const subjects = grazers.map((grazer) => ({
    name: grazer.name,
    url: grazer.url,
    targetHeight: grazer.targetHeight,
    restingClip: grazer.clips.resting,
  }))
  subjects.push({ name: 'Keeper', url: keeper.url, targetHeight: keeper.targetHeight, restingClip: keeper.clips.Idle })
  return new Map(subjects.map((subject) => [subject.name.toLowerCase(), subject]))
}

/**
 * Parse the spike's query string. An unknown pack falls back to Quaternius so
 * the original `?spike=3d` URL keeps meaning what ADR-0004 measured; an
 * unknown silhouette name is an error, because a typo there would silently
 * measure nothing.
 */
export function spikeRouteFrom(search: string): SpikeRoute {
  const params = new URLSearchParams(search)
  const pack = packFrom(params.get('pack'))
  const wanted = params.get('silhouette')
  if (wanted === null) return { view: 'scene', pack }
  const model = silhouetteSubjects(pack).get(wanted.toLowerCase())
  if (!model) throw new Error(`spike: no "${wanted}" in the ${pack} pack`)
  return { view: 'silhouette', pack, model, yaw: silhouetteYaw(turnFrom(params.get('turn'))) }
}

