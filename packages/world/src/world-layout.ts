/**
 * The shape of a farm layout. Plain, serialisable data: the renderer turns it
 * into meshes, the rules read it, nothing here knows Three.js exists.
 *
 * Conventions (docs/art-direction.md §2 and §8): 1 unit = 1 m; the ground lies
 * on the XZ plane centred on the origin; a model's origin is at its base and it
 * faces −Z at 0°. Anything that lives on the ground is 2D `[x, z]`; anything
 * placed in the world is 3D `[x, y, z]` with rotation about Y only.
 */

export const LAYOUT_SCHEMA_VERSION = 1

/** The seven hotspots of docs/implementation-plan.md, in walk-around order. */
export const HOTSPOT_IDS = [
  'barn',
  'feed-shed',
  'nest',
  'paddock',
  'training-ring',
  'petting-zoo',
  'farmhouse',
] as const

export type HotspotId = (typeof HOTSPOT_IDS)[number]

/** Palette tokens from docs/art-direction.md §4 that a surface may be painted with. */
export const GROUND_MATERIALS = ['grass', 'soil'] as const

export type GroundMaterial = (typeof GROUND_MATERIALS)[number]

/** A spot on the ground plane: `[x, z]`. */
export type Point2 = readonly [x: number, z: number]

/** A spot in the world: `[x, y, z]`. */
export type Point3 = readonly [x: number, y: number, z: number]

/** Degrees clockwise about Y from the model's authored facing (−Z). Degrees, not radians: the file is hand-edited. */
export type Degrees = number

/** A patch of ground — a hotspot's footprint, or the volume that says the keeper has arrived. */
export type Area =
  | { readonly shape: 'circle'; readonly centre: Point2; readonly radius: number }
  | { readonly shape: 'box'; readonly centre: Point2; readonly size: Point2 }

export interface Ground {
  /** `[width, depth]` of the walkable farm, centred on the origin. */
  readonly size: Point2
  readonly material: GroundMaterial
}

/** Where the camera sits and what it points at. The scene eases between anchors, never cuts. */
export interface CameraAnchor {
  readonly position: Point3
  readonly lookAt: Point3
}

export interface WorldCamera {
  /** Vertical field of view in degrees. */
  readonly fov: number
  /** The resting anchor: the whole farm, before any hotspot re-frames it. */
  readonly home: CameraAnchor
}

/** A trodden route between two places, drawn as a strip of `width` along the polyline. */
export interface FarmPath {
  readonly id: string
  readonly width: number
  readonly points: readonly Point2[]
}

export interface Hotspot {
  readonly id: HotspotId
  /** Model id under `apps/web/public/models/<model>.glb`. */
  readonly model: string
  readonly position: Point3
  readonly rotationY: Degrees
  /** The ground the hotspot occupies: what a navmesh must route around. */
  readonly footprint: Area
  /** Where the keeper stands when they get here. Always inside `trigger`. */
  readonly arrival: Point2
  /** Standing in here means "the keeper is at this hotspot". Triggers never overlap. */
  readonly trigger: Area
  readonly cameraAnchor: CameraAnchor
}

export interface PropInstance {
  readonly position: Point3
  readonly rotationY: Degrees
}

/** One model plus every place it is repeated — the instancing unit of docs/performance-budget.md rule 3. */
export interface PropGroup {
  readonly model: string
  readonly instances: readonly PropInstance[]
}

export interface WorldLayout {
  readonly schemaVersion: typeof LAYOUT_SCHEMA_VERSION
  readonly ground: Ground
  readonly camera: WorldCamera
  readonly paths: readonly FarmPath[]
  readonly hotspots: readonly Hotspot[]
  readonly props: readonly PropGroup[]
}
