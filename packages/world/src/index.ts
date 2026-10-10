export type {
  Area,
  CameraAnchor,
  Degrees,
  FarmPath,
  Ground,
  GroundMaterial,
  Hotspot,
  HotspotId,
  Point2,
  Point3,
  PropGroup,
  PropInstance,
  WorldCamera,
  WorldLayout,
} from './world-layout'
export { GROUND_MATERIALS, HOTSPOT_IDS, LAYOUT_SCHEMA_VERSION } from './world-layout'

export type { ParsedFarmLayout } from './parse-farm-layout'
export { parseFarmLayout } from './parse-farm-layout'

export { loadFarmLayout } from './farm-layout'

export { hotspotContaining } from './hotspot-containing'

export { areaContains, areasOverlap, areaWithinGround, distance2, pointWithinGround } from './geometry'

export {
  KEEPER_SPEED,
  MAX_CAMERA_ELEVATION_DEGREES,
  MAX_CAMERA_FOV_DEGREES,
  MAX_CROSSING_SECONDS,
  MAX_GROUND_SIZE,
  MIN_CAMERA_ELEVATION_DEGREES,
  MIN_CAMERA_FOV_DEGREES,
  cameraElevationDegrees,
  crossingSeconds,
  layoutRuleViolations,
  slowestCrossingSeconds,
} from './layout-rules'
