import { PNG } from 'pngjs'
import type { NativeBounds, Vec3 } from '../piece-fit'

/**
 * The files actually under `public/models`, read at test time through Vite, so
 * the catalogue is checked against what ships rather than against itself.
 * Keys are served URLs (`/models/kenney/<kit>/<file>`).
 */
const glbs = import.meta.glob<string>('../../../public/models/**/*.glb', { query: '?inline', import: 'default', eager: true })
const pngs = import.meta.glob('../../../public/models/**/*.png', { query: '?url', import: 'default', eager: true })
const atlasPngs = import.meta.glob<string>('../../../public/models/**/*.png', {
  query: '?inline',
  import: 'default',
  eager: true,
})

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
type GltfPrimitive = { attributes: { POSITION: number; TEXCOORD_0?: number }; indices?: number }
export type GltfJson = {
  scene?: number
  scenes: { nodes: number[] }[]
  nodes: GltfNode[]
  meshes: { primitives: GltfPrimitive[] }[]
  accessors: {
    min?: number[]
    max?: number[]
    bufferView?: number
    byteOffset?: number
    count: number
    componentType?: number
  }[]
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

type Visit = (primitive: GltfPrimitive, world: Matrix) => void

/** Calls `visit` with each mesh primitive and its node's world matrix. */
function eachPrimitive(gltf: GltfJson, visit: Visit): void {
  const walk = (index: number, parent: Matrix) => {
    const node = gltf.nodes[index]!
    const world = multiply(parent, localMatrix(node))
    for (const primitive of node.mesh === undefined ? [] : gltf.meshes[node.mesh]!.primitives) visit(primitive, world)
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
  eachPrimitive(gltf, ({ attributes }, world) => {
    const { min: lo = [], max: hi = [] } = gltf.accessors[attributes.POSITION]!
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

/** Reads element `i` of a float accessor as `width` numbers (VEC2 → 2, VEC3 → 3). */
function floatReader({ json, bin }: Glb, accessorIndex: number, width: number): (i: number) => number[] {
  const accessor = json.accessors[accessorIndex]!
  const bufferView = json.bufferViews[accessor.bufferView ?? 0]!
  const stride = bufferView.byteStride ?? width * 4
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  return (i) => Array.from({ length: width }, (_, k) => bin.getFloat32(start + i * stride + k * 4, true))
}

const INDEX_BYTES: Readonly<Record<number, 1 | 2 | 4>> = { 5121: 1, 5123: 2, 5125: 4 }

/** The primitive's triangle list: its index accessor, or 0, 1, 2, … when it has none. */
function triangleIndices({ json, bin }: Glb, primitive: GltfPrimitive): number[] {
  const count = json.accessors[primitive.attributes.POSITION]!.count
  if (primitive.indices === undefined) return Array.from({ length: count }, (_, i) => i)
  const accessor = json.accessors[primitive.indices]!
  const bytes = INDEX_BYTES[accessor.componentType ?? 5125]
  if (!bytes) throw new Error(`Unsupported index component type ${accessor.componentType}`)
  const start = (json.bufferViews[accessor.bufferView ?? 0]!.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const read = { 1: (at: number) => bin.getUint8(at), 2: (at: number) => bin.getUint16(at, true), 4: (at: number) => bin.getUint32(at, true) }[bytes]
  return Array.from({ length: accessor.count }, (_, i) => read(start + i * bytes))
}

/** Every vertex of a served GLB in its scene's space (bind pose; skins are not applied). */
export function readVertices(url: string): Vec3[] {
  const glb = readGlb(url)
  const vertices: Vec3[] = []
  eachPrimitive(glb.json, (primitive, world) => {
    const position = floatReader(glb, primitive.attributes.POSITION, 3)
    const count = glb.json.accessors[primitive.attributes.POSITION]!.count
    for (let i = 0; i < count; i++) vertices.push(apply(world, position(i) as unknown as Vec3))
  })
  return vertices
}

export type TexturedTriangle = { readonly corners: readonly [Vec3, Vec3, Vec3]; readonly uvs: readonly [UV, UV, UV] }
export type UV = readonly [number, number]

/** Every triangle of a served GLB in its scene's space, with the atlas UVs of its corners. */
export function readTexturedTriangles(url: string): TexturedTriangle[] {
  const glb = readGlb(url)
  const triangles: TexturedTriangle[] = []
  eachPrimitive(glb.json, (primitive, world) => {
    const uvAccessor = primitive.attributes.TEXCOORD_0
    if (uvAccessor === undefined) throw new Error(`${url} has a primitive without TEXCOORD_0`)
    const position = floatReader(glb, primitive.attributes.POSITION, 3)
    const uv = floatReader(glb, uvAccessor, 2)
    const indices = triangleIndices(glb, primitive)
    for (let t = 0; t + 2 < indices.length; t += 3) {
      const corner = [0, 1, 2].map((k) => indices[t + k]!)
      triangles.push({
        corners: corner.map((i) => apply(world, position(i) as unknown as Vec3)) as unknown as TexturedTriangle['corners'],
        uvs: corner.map((i) => uv(i) as unknown as UV) as unknown as TexturedTriangle['uvs'],
      })
    }
  })
  return triangles
}

export type AtlasPixels = { readonly width: number; readonly height: number; readonly rgba: Uint8Array }

/** A served atlas PNG, decoded to RGBA bytes, row 0 at the top as the file stores it. */
export function readAtlasPixels(url: string): AtlasPixels {
  const entry = Object.entries(atlasPngs).find(([key]) => servedUrl(key) === url)
  if (!entry) throw new Error(`No served PNG at ${url}`)
  const png = PNG.sync.read(Buffer.from(entry[1].split(',')[1] ?? '', 'base64'))
  return { width: png.width, height: png.height, rgba: new Uint8Array(png.data) }
}
