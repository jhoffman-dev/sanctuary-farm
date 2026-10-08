/**
 * JSON → `WorldLayout`. Hand-written in the idiom of
 * `packages/persistence/src/parse-farm-save.ts` so `@sf/world` needs no schema
 * library: every value is re-checked and the layout is rebuilt from validated
 * primitives, so a stray key from a hand edit never reaches the renderer.
 *
 * It never throws. Structure first (types, ranges, closed sets, the seven
 * hotspots exactly once), then the art-direction rules in `layout-rules.ts`.
 */
import { layoutRuleViolations } from './layout-rules'
import {
  fail,
  parseOrReason,
  requireArray,
  requireFinite,
  requireOneOf,
  requireOnlyKeys,
  requirePositive,
  requireRecord,
} from './parse-primitives'
import type {
  Area,
  CameraAnchor,
  Degrees,
  FarmPath,
  Ground,
  Hotspot,
  Point2,
  Point3,
  PropGroup,
  PropInstance,
  WorldCamera,
  WorldLayout,
} from './world-layout'
import { GROUND_MATERIALS, HOTSPOT_IDS, LAYOUT_SCHEMA_VERSION } from './world-layout'

export type ParsedFarmLayout = { ok: true; layout: WorldLayout } | { ok: false; reason: string }

/** Model ids address `apps/web/public/models/<category>/<name>.glb` (art-direction §8). */
const MODEL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/

function requireModelId(value: unknown, path: string): string {
  if (typeof value !== 'string' || !MODEL_ID.test(value)) fail(path, 'expected a model id like "buildings/barn"')
  return value
}

function requirePoint2(value: unknown, path: string): Point2 {
  const point = requireArray(value, path)
  if (point.length !== 2) fail(path, 'expected [x, z]')
  return [requireFinite(point[0], `${path}[0]`), requireFinite(point[1], `${path}[1]`)]
}

function requireSize2(value: unknown, path: string): Point2 {
  const size = requireArray(value, path)
  if (size.length !== 2) fail(path, 'expected [width, depth]')
  return [requirePositive(size[0], `${path}[0]`), requirePositive(size[1], `${path}[1]`)]
}

function requirePoint3(value: unknown, path: string): Point3 {
  const point = requireArray(value, path)
  if (point.length !== 3) fail(path, 'expected [x, y, z]')
  return [
    requireFinite(point[0], `${path}[0]`),
    requireFinite(point[1], `${path}[1]`),
    requireFinite(point[2], `${path}[2]`),
  ]
}

function requireDegrees(value: unknown, path: string): Degrees {
  const degrees = requireFinite(value, path)
  if (degrees < 0 || degrees >= 360) fail(path, 'expected degrees in [0, 360)')
  return degrees
}

function parseArea(value: unknown, path: string): Area {
  const area = requireRecord(value, path)
  if (area.shape === 'circle') {
    requireOnlyKeys(area, ['shape', 'centre', 'radius'], path)
    return {
      shape: 'circle',
      centre: requirePoint2(area.centre, `${path}.centre`),
      radius: requirePositive(area.radius, `${path}.radius`),
    }
  }
  if (area.shape === 'box') {
    requireOnlyKeys(area, ['shape', 'centre', 'size'], path)
    return {
      shape: 'box',
      centre: requirePoint2(area.centre, `${path}.centre`),
      size: requireSize2(area.size, `${path}.size`),
    }
  }
  return fail(`${path}.shape`, 'expected "circle" or "box"')
}

function parseGround(value: unknown): Ground {
  const ground = requireRecord(value, 'ground')
  requireOnlyKeys(ground, ['size', 'material'], 'ground')
  const material = requireOneOf(ground.material, GROUND_MATERIALS, 'ground.material')
  return { size: requireSize2(ground.size, 'ground.size'), material }
}

function parseCameraAnchor(value: unknown, path: string): CameraAnchor {
  const anchor = requireRecord(value, path)
  requireOnlyKeys(anchor, ['position', 'lookAt'], path)
  return {
    position: requirePoint3(anchor.position, `${path}.position`),
    lookAt: requirePoint3(anchor.lookAt, `${path}.lookAt`),
  }
}

function parseCamera(value: unknown): WorldCamera {
  const camera = requireRecord(value, 'camera')
  requireOnlyKeys(camera, ['fov', 'home'], 'camera')
  return { fov: requirePositive(camera.fov, 'camera.fov'), home: parseCameraAnchor(camera.home, 'camera.home') }
}

function parsePath(value: unknown, index: number): FarmPath {
  const path = `paths[${index}]`
  const route = requireRecord(value, path)
  requireOnlyKeys(route, ['id', 'width', 'points'], path)
  if (typeof route.id !== 'string' || route.id.length === 0) fail(`${path}.id`, 'expected a non-empty string')
  const points = requireArray(route.points, `${path}.points`)
  if (points.length < 2) fail(`${path}.points`, 'expected at least two points')
  return {
    id: route.id,
    width: requirePositive(route.width, `${path}.width`),
    points: points.map((point, at) => requirePoint2(point, `${path}.points[${at}]`)),
  }
}

const HOTSPOT_KEYS = ['id', 'model', 'position', 'rotationY', 'footprint', 'arrival', 'trigger', 'cameraAnchor']

function parseHotspot(value: unknown, index: number): Hotspot {
  const path = `hotspots[${index}]`
  const hotspot = requireRecord(value, path)
  requireOnlyKeys(hotspot, HOTSPOT_KEYS, path)
  return {
    id: requireOneOf(hotspot.id, HOTSPOT_IDS, `${path}.id`),
    model: requireModelId(hotspot.model, `${path}.model`),
    position: requirePoint3(hotspot.position, `${path}.position`),
    rotationY: requireDegrees(hotspot.rotationY, `${path}.rotationY`),
    footprint: parseArea(hotspot.footprint, `${path}.footprint`),
    arrival: requirePoint2(hotspot.arrival, `${path}.arrival`),
    trigger: parseArea(hotspot.trigger, `${path}.trigger`),
    cameraAnchor: parseCameraAnchor(hotspot.cameraAnchor, `${path}.cameraAnchor`),
  }
}

function parseHotspots(value: unknown): Hotspot[] {
  const hotspots = requireArray(value, 'hotspots').map(parseHotspot)
  for (const id of HOTSPOT_IDS) {
    const found = hotspots.filter((hotspot) => hotspot.id === id).length
    if (found === 0) fail('hotspots', `missing ${id}`)
    if (found > 1) fail('hotspots', `duplicate ${id}`)
  }
  return hotspots
}

function parsePropInstance(value: unknown, path: string): PropInstance {
  const instance = requireRecord(value, path)
  requireOnlyKeys(instance, ['position', 'rotationY'], path)
  return {
    position: requirePoint3(instance.position, `${path}.position`),
    rotationY: requireDegrees(instance.rotationY, `${path}.rotationY`),
  }
}

function parsePropGroup(value: unknown, index: number): PropGroup {
  const path = `props[${index}]`
  const group = requireRecord(value, path)
  requireOnlyKeys(group, ['model', 'instances'], path)
  const instances = requireArray(group.instances, `${path}.instances`)
  if (instances.length === 0) fail(`${path}.instances`, 'expected at least one instance')
  return {
    model: requireModelId(group.model, `${path}.model`),
    instances: instances.map((instance, at) => parsePropInstance(instance, `${path}.instances[${at}]`)),
  }
}

function buildLayout(raw: unknown): WorldLayout {
  const document = requireRecord(raw, 'layout')
  requireOnlyKeys(document, ['schemaVersion', 'ground', 'camera', 'paths', 'hotspots', 'props'], 'layout')
  if (document.schemaVersion !== LAYOUT_SCHEMA_VERSION) {
    fail('schemaVersion', `expected ${LAYOUT_SCHEMA_VERSION}`)
  }
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    ground: parseGround(document.ground),
    camera: parseCamera(document.camera),
    paths: requireArray(document.paths, 'paths').map(parsePath),
    hotspots: parseHotspots(document.hotspots),
    props: requireArray(document.props, 'props').map(parsePropGroup),
  }
}

/**
 * The only way into a `WorldLayout`. A malformed or rule-breaking document
 * comes back as `{ ok: false, reason }` naming the path that failed — the
 * caller decides whether that is a broken build or a bad hand edit.
 */
export function parseFarmLayout(raw: unknown): ParsedFarmLayout {
  const built = parseOrReason(() => buildLayout(raw))
  if (!built.ok) return built
  const [violation] = layoutRuleViolations(built.value)
  return violation === undefined ? { ok: true, layout: built.value } : { ok: false, reason: violation }
}
