import { createHash } from 'node:crypto'

// Godot names every export file after the export path (`index.wasm`,
// `index.pck`, ...), so a new build reuses the old URLs and nothing can be
// cached for long. This renames the engine and the pack after their content
// and points the page at the new names, so Hosting can serve them `immutable`
// while `index.html` stays `no-cache` (SF-100).

/** The engine files Godot's loader derives from `executable` (platform/web/js/engine/config.js). */
const ENGINE_SUFFIXES = ['.wasm', '.js', '.audio.worklet.js', '.audio.position.worklet.js'] as const

const CONFIG_PATTERN = /const GODOT_CONFIG = (\{.*?\});/

export interface ExportFile {
  name: string
  bytes: Uint8Array
}

export interface FingerprintPlan {
  /** Old file name → new file name, for every file that moves. */
  renames: Map<string, string>
  html: string
}

interface GodotConfig {
  executable: string
  mainPack?: string
  fileSizes: Record<string, number>
}

const contentHash = (parts: readonly Uint8Array[]): string => {
  const hash = createHash('sha256')
  for (const part of parts) hash.update(part)
  return hash.digest('hex').slice(0, 12)
}

const readConfig = (html: string): GodotConfig => {
  const match = CONFIG_PATTERN.exec(html)
  if (!match) throw new Error('index.html has no GODOT_CONFIG: not a Godot web export, or the shell changed')
  return JSON.parse(match[1]) as GodotConfig
}

const fileNamed = (files: readonly ExportFile[], name: string): ExportFile => {
  const file = files.find((candidate) => candidate.name === name)
  if (!file) throw new Error(`the export has no ${name}`)
  return file
}

const renameKeys = (sizes: Record<string, number>, renames: Map<string, string>): Record<string, number> =>
  Object.fromEntries(Object.entries(sizes).map(([name, size]) => [renames.get(name) ?? name, size]))

/**
 * Plans the content-hashed names for a Godot web export: `engine-<hash>.*`
 * for the wasm, its loader and audio worklets (one hash, they ship together),
 * `game-<hash>.pck` for the pack, and the page rewritten to load them.
 */
export const planFingerprint = (html: string, files: readonly ExportFile[]): FingerprintPlan => {
  const config = readConfig(html)
  const stem = config.executable
  const engineFiles = ENGINE_SUFFIXES.map((suffix) => files.find((file) => file.name === `${stem}${suffix}`)).filter(
    (file): file is ExportFile => file !== undefined,
  )
  fileNamed(engineFiles, `${stem}.wasm`)
  fileNamed(engineFiles, `${stem}.js`)
  const pack = fileNamed(files, config.mainPack ?? `${stem}.pck`)

  const engineStem = `engine-${contentHash(engineFiles.map((file) => file.bytes))}`
  const packName = `game-${contentHash([pack.bytes])}.pck`
  const renames = new Map<string, string>(engineFiles.map((file) => [file.name, `${engineStem}${file.name.slice(stem.length)}`]))
  renames.set(pack.name, packName)

  const rewritten: GodotConfig = { ...config, executable: engineStem, mainPack: packName, fileSizes: renameKeys(config.fileSizes, renames) }
  const loaderTag = `<script src="${stem}.js">`
  if (!html.includes(loaderTag)) throw new Error(`index.html does not load ${stem}.js`)
  const newHtml = html
    .replace(CONFIG_PATTERN, () => `const GODOT_CONFIG = ${JSON.stringify(rewritten)};`)
    .replace(loaderTag, `<script src="${engineStem}.js">`)
  return { renames, html: newHtml }
}
