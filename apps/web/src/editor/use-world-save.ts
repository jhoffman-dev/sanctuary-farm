import type { WorldDraft } from '@sf/world'
import { useCallback, useRef, useState } from 'react'
import type { SaveStatus } from './EditorToolbar'
import { type Post, saveWorldDraft } from './save-client'

export type WorldSave = {
  readonly status: SaveStatus
  readonly setStatus: (status: SaveStatus) => void
  readonly save: () => Promise<void>
}

/** Save for the editor: posts `draft`, reports progress, and tells `onSaved` which draft reached disk. */
export function useWorldSave({ draft, post, onSaved }: { draft: WorldDraft; post: Post; onSaved: (draft: WorldDraft) => void }): WorldSave {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })
  // A ref, not `status`: two ⌘S in one frame both see the status before React re-renders.
  const saving = useRef(false)
  const save = useCallback(async () => {
    // One save at a time (the button is disabled too), so the draft marked saved is the one on disk.
    if (saving.current) return
    saving.current = true
    setStatus({ kind: 'saving' })
    const outcome = await saveWorldDraft(draft, post).finally(() => {
      saving.current = false
    })
    if (!outcome.ok) {
      setStatus({ kind: 'failed', reason: outcome.reason })
      return
    }
    onSaved(draft)
    setStatus({ kind: 'saved', message: 'Saved to packages/world/layouts — commit it, or ask an agent to open a PR.' })
  }, [draft, post, onSaved])
  return { status, setStatus, save }
}
