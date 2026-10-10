import type { NativeBounds, Vec3 } from '../piece-fit'

/**
 * The files actually under `public/models`, read at test time through Vite, so
 * the catalogue is checked against what ships rather than against itself.
 * Keys are served URLs (`/models/kenney/<kit>/<file>`).
 */
const glbs = import.meta.glob<string>('../../../public/models/**/*.glb', { query: '?inline', import: 'default', eager: true })
const pngs = import.meta.glob('../../../public/models/**/*.png', { query: '?url', import: 'default', eager: true })

const licenceFiles = import.meta.glob<string>('../../../public/models/**/License.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function servedUrl(globKey: string): string {
  return globKey.replace(/^(\.\.\/)+public/, '')
}

export const SERVED_URLS: ReadonlySet<string> = new Set([...Object.keys(glbs), ...Object.keys(pngs)].map(servedUrl))

/** Served URL of each `License.txt` → its text. */
export const LICENCES: ReadonlyMap<string, string> = new Map(
  Object.entries(licenceFiles).map(([key, text]) => [servedUrl(key), text]),
)

type GltfNode = {
  mesh?: number
  children?: number[]
  translation?: Vec3
  rotation?: readonly [number, number, number, number]
  scale?: Vec3
  matrix?: readonly number[]
}
export type GltfJson = {
  scene?: number
  scenes: { nodes: number[] }[]
  nodes: GltfNode[]
  meshes: { primitives: { attributes: { POSITION: number } }[] }[]
  accessors: { min?: number[]; max?: number[]; bufferView?: number; byteOffset?: number; count: number }[]
  bufferViews: { byteOffset?: number; byteStride?: number }[]
  images?: { uri?: string; bufferView?: number }[]
  animations?: { name?: string }[]
}

type Glb = { json: GltfJson; bin: DataView }

/** A served GLB split into its JSON chunk and binary chunk (header 12 bytes, then length/type/data per chunk). */
function readGlb(url: string): Glb {
  const entry = Object.entries(glbs).find(([key]) => servedUrl(key) === url)
  if (!entry) throw new Error(`No served GLB at ${url}`)
  const bytes = Uint8Array.from(atob(entry[1].split(',')[1] ?? ''), (char) => char.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  const jsonLength = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as GltfJson
  const binStart = 20 + jsonLength + 8
  return { json, bin: new DataView(bytes.buffer, binStart, view.getUint32(20 + jsonLength, true)) }
}

export function readGltfJson(url: string): GltfJson {
  return readGlb(url).json
}

type Matrix = number[] // column-major 4×4, as glTF stores it

function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Array<number>(16).fill(0)
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++) out[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!
  return out
}

function localMatrix(node: GltfNode): Matrix {
  if (node.matrix) return [...node.matrix]
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

type Visit = (accessor: number, world: Matrix) => void

/** Calls `visit` with each POSITION accessor and its node's world matrix. */
function eachPositionAccessor(gltf: GltfJson, visit: Visit): void {
  const walk = (index: number, parent: Matrix) => {
    const node = gltf.nodes[index]!
    const world = multiply(parent, localMatrix(node))
    for (const primitive of node.mesh === undefined ? [] : gltf.meshes[node.mesh]!.primitives) {
      visit(primitive.attributes.POSITION, world)
    }
    for (const child of node.children ?? []) walk(child, world)
  }
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  for (const root of gltf.scenes[gltf.scene ?? 0]!.nodes) walk(root, identity)
}

function apply(world: Matrix, [x, y, z]: Vec3): Vec3 {
  const axis = (i: number) => world[i]! * x + world[4 + i]! * y + world[8 + i]! * z + world[12 + i]!
  return [axis(0), axis(1), axis(2)]
}

/** Bounds of every mesh's POSITION accessor min/max corners, carried through the node transforms. */
export function measureBounds(gltf: GltfJson): NativeBounds {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  eachPositionAccessor(gltf, (accessorIndex, world) => {
    const { min: lo = [], max: hi = [] } = gltf.accessors[accessorIndex]!
    for (const cx of [lo[0]!, hi[0]!])
      for (const cy of [lo[1]!, hi[1]!])
        for (const cz of [lo[2]!, hi[2]!]) {
          const point = apply(world, [cx, cy, cz])
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i]!, point[i]!)
            max[i] = Math.max(max[i]!, point[i]!)
          }
        }
  })
  return { min: min as unknown as Vec3, max: max as unknown as Vec3 }
}

/** Every vertex of a served GLB in its scene's space (bind pose; skins are not applied). */
export function readVertices(url: string): Vec3[] {
  const { json, bin } = readGlb(url)
  const vertices: Vec3[] = []
  eachPositionAccessor(json, (accessorIndex, world) => {
    const accessor = json.accessors[accessorIndex]!
    const bufferView = json.bufferViews[accessor.bufferView ?? 0]!
    const stride = bufferView.byteStride ?? 12
    const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    for (let i = 0; i < accessor.count; i++) {
      const at = start + i * stride
      vertices.push(apply(world, [bin.getFloat32(at, true), bin.getFloat32(at + 4, true), bin.getFloat32(at + 8, true)]))
    }
  })
  return vertices
}
