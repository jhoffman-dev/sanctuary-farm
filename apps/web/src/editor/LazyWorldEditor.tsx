import { Suspense, use } from 'react'
import { SceneLoading } from '../scene/SceneLoading'
import type { WorldEditorSession, WorldEditorSessionLoader } from './editor-session'

type LoadedEditor = { readonly editor: typeof import('./WorldEditor'); readonly session: WorldEditorSession }

/** One load per page, kept so `use` sees the same promise on every render. */
const loading = new WeakMap<WorldEditorSessionLoader, Promise<LoadedEditor>>()

function loadEditor(loadSession: WorldEditorSessionLoader): Promise<LoadedEditor> {
  const cached = loading.get(loadSession)
  if (cached) return cached
  const started = Promise.all([import('./WorldEditor'), loadSession()]).then(([editor, session]) => ({ editor, session }))
  loading.set(loadSession, started)
  return started
}

function LoadedWorldEditor({ loadSession }: { loadSession: WorldEditorSessionLoader }) {
  const { editor, session } = use(loadEditor(loadSession))
  return <editor.WorldEditor session={session} />
}

/**
 * The world editor, in its own chunk with three.js, for dev builds only:
 * `main.tsx` renders it behind `import.meta.env.DEV`, so a production build
 * never reaches the `import()` and emits no editor chunk.
 */
export function LazyWorldEditor({ loadSession }: { loadSession: WorldEditorSessionLoader }) {
  return (
    <Suspense fallback={<SceneLoading />}>
      <LoadedWorldEditor loadSession={loadSession} />
    </Suspense>
  )
}
