import type { WorldEditorSession } from '../editor/editor-session'

/** The editor's world inputs travel in their own chunk, with the editor; dev builds only (`main.tsx`). */
export async function loadWorldEditorSession(): Promise<WorldEditorSession> {
  const { worldEditorSession } = await import('./world-editor-session')
  return worldEditorSession()
}
