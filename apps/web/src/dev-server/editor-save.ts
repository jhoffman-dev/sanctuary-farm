/**
 * What the world editor's save endpoint accepts (#105), kept apart from the
 * server so it is testable alone. A body is parsed with the same never-throws
 * parsers the game loads the files with, and written back in their canonical
 * text — so a save can never put a file in the repo that the game would refuse.
 */
import { parseWorldOverrides, parseWorldSettings, serializeWorldOverrides, serializeWorldSettings } from '@sf/world'
import { EDITOR_SAVE_FILES, type EditorSaveTarget, type PreparedSave } from './editor-save-routes'

function canonicalText(target: EditorSaveTarget, document: unknown): PreparedSave {
  if (target === 'overrides') {
    const parsed = parseWorldOverrides(document)
    return parsed.ok ? { ok: true, contents: serializeWorldOverrides(parsed.overrides) } : parsed
  }
  const parsed = parseWorldSettings(document)
  return parsed.ok ? { ok: true, contents: serializeWorldSettings(parsed.settings) } : parsed
}

/** The file text to write for a request body, or why the body was refused. */
export function prepareEditorSave(target: EditorSaveTarget, body: string): PreparedSave {
  let document: unknown
  try {
    document = JSON.parse(body)
  } catch (error) {
    // A malformed body is an answer for the editor, not a server fault.
    return { ok: false, reason: `the body is not JSON — ${error instanceof Error ? error.message : String(error)}` }
  }
  const prepared = canonicalText(target, document)
  return prepared.ok ? prepared : { ok: false, reason: `${EDITOR_SAVE_FILES[target]} was not saved — ${prepared.reason}` }
}
