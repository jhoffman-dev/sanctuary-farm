/**
 * The world editor's save routes and the files they write. Free of `@sf/world`
 * on purpose: the Vite config imports this through the plugin, and Node loads
 * the config without a TypeScript-aware resolver for workspace packages.
 */
export const EDITOR_SAVE_TARGETS = ['overrides', 'world'] as const
export type EditorSaveTarget = (typeof EDITOR_SAVE_TARGETS)[number]

/** The file under `packages/world/layouts/` each target writes. */
export const EDITOR_SAVE_FILES: Record<EditorSaveTarget, string> = {
  overrides: 'overrides.json',
  world: 'world.json',
}

const ROUTE_PREFIX = '/__editor/'

export function editorSaveRoute(target: EditorSaveTarget): string {
  return `${ROUTE_PREFIX}${target}`
}

/** The target a request path names, e.g. `/__editor/overrides`, or `null` for any other path. */
export function editorSaveTarget(path: string): EditorSaveTarget | null {
  if (!path.startsWith(ROUTE_PREFIX)) return null
  const name = path.slice(ROUTE_PREFIX.length)
  return EDITOR_SAVE_TARGETS.find((target) => target === name) ?? null
}

export type PreparedSave = { ok: true; contents: string } | { ok: false; reason: string }

/** Turns a request body into the file text to write, or the reason it was refused. */
export type PrepareEditorSave = (target: EditorSaveTarget, body: string) => PreparedSave
