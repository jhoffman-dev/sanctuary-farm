import { type WorldDraft, serializeWorldOverrides, serializeWorldSettings } from '@sf/world'
import { useCallback, useMemo, useReducer, useState } from 'react'
import { HOME_VIEW, overviewOf } from '../scene/camera-views'
import type { CameraCommand } from './EditorControls'
import { EditorCanvas } from './EditorCanvas'
import { EditorToolbar } from './EditorToolbar'
import type { EditorCommand } from './editor-keys'
import type { WorldEditorSession } from './editor-session'
import { createEditorReducer, initialEditorState, pendingChanges } from './editor-state'
import type { Tool } from './editor-tools'
import { Inspector } from './Inspector'
import { Palette } from './Palette'
import type { Post } from './save-client'
import { ShortcutLegend } from './ShortcutLegend'
import { useEditorKeys } from './use-editor-keys'
import { useWorldSave } from './use-world-save'
import { WorldPanel } from './WorldPanel'

type CameraState = CameraCommand & { readonly topDown: boolean }

const postToDevServer: Post = (url, init) => fetch(url, init)

/** Half a chunk of the land beyond the farm stays in the top-down frame, so there is room to add more. */
const TOP_DOWN_MARGIN_TILES = 8

/**
 * The world editor (#105): palette on the left, the farm in the middle,
 * inspector and world settings on the right, tools and Save across the top.
 * Every change goes through the reducer, which hands it to `@sf/world`.
 */
export function WorldEditor({ session }: { session: WorldEditorSession }) {
  const reducer = useMemo(() => createEditorReducer(session), [session])
  const [state, dispatch] = useReducer(reducer, session, initialEditorState)
  const [camera, setCamera] = useState<CameraState>({ view: HOME_VIEW, id: 0, topDown: false })
  const [ready, setReady] = useState(false)
  const present = state.history.present

  const showGameCamera = useCallback(() => setCamera((current) => ({ view: HOME_VIEW, id: current.id + 1, topDown: false })), [])
  const toggleTopDown = useCallback(
    () =>
      setCamera((current) =>
        current.topDown
          ? { view: HOME_VIEW, id: current.id + 1, topDown: false }
          : { view: overviewOf(present.settings.chunks, TOP_DOWN_MARGIN_TILES), id: current.id + 1, topDown: true },
      ),
    [present.settings.chunks],
  )

  const onSaved = useCallback((draft: WorldDraft) => dispatch({ type: 'saved', draft }), [])
  const { status, setStatus, save } = useWorldSave({ draft: present, post: postToDevServer, onSaved })

  const copy = useCallback((label: string, text: string) => {
    navigator.clipboard.writeText(text).then(
      () => setStatus({ kind: 'saved', message: `Copied ${label} to the clipboard.` }),
      (error: unknown) => setStatus({ kind: 'failed', reason: `the clipboard refused (${String(error)})` }),
    )
  }, [setStatus])

  const chooseTool = useCallback((tool: Tool) => dispatch({ type: 'choose-tool', tool }), [])

  const run = useCallback(
    (command: EditorCommand) => {
      const commands: Record<EditorCommand, () => void> = {
        undo: () => dispatch({ type: 'undo' }),
        redo: () => dispatch({ type: 'redo' }),
        save: () => void save(),
        rotate: () => dispatch({ type: 'rotate' }),
        'select-tool': () => chooseTool({ kind: 'select' }),
        'erase-tool': () => chooseTool({ kind: 'erase' }),
        'move-hotspot-tool': () => chooseTool({ kind: 'move-hotspot' }),
        'add-land-tool': () => chooseTool({ kind: 'add-land' }),
        'game-camera': showGameCamera,
        'top-down': toggleTopDown,
        cancel: () => {
          chooseTool({ kind: 'select' })
          dispatch({ type: 'select', at: null })
        },
      }
      commands[command]()
    },
    [save, chooseTool, showGameCamera, toggleTopDown],
  )
  useEditorKeys(run)

  return (
    <div className="flex h-full w-full bg-stone-100 text-sm text-stone-800" data-testid="world-editor" data-ready={ready}>
      <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-stone-300 p-3">
        <h1 className="text-base font-bold">World editor</h1>
        <Palette tool={state.tool} onChoose={chooseTool} />
        <ShortcutLegend />
      </aside>
      <main className="relative min-w-0 flex-1">
        <EditorCanvas
          world={state.world}
          land={present.settings.chunks}
          tool={state.tool}
          rotation={state.rotation}
          selected={state.selected}
          camera={camera}
          dispatch={dispatch}
          onReady={() => setReady(true)}
        />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex">
          <EditorToolbar
            tool={state.tool}
            rotation={state.rotation}
            topDown={camera.topDown}
            canUndo={state.history.past.length > 0}
            canRedo={state.history.future.length > 0}
            unsaved={pendingChanges(state)}
            status={status}
            onTool={chooseTool}
            onRotate={() => dispatch({ type: 'rotate' })}
            onGameCamera={showGameCamera}
            onTopDown={toggleTopDown}
            onUndo={() => dispatch({ type: 'undo' })}
            onRedo={() => dispatch({ type: 'redo' })}
            onSave={() => void save()}
          />
        </div>
      </main>
      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-stone-300 p-3">
        <Inspector
          world={state.world}
          overrides={present.overrides}
          selected={state.selected}
          onRevert={(at) => dispatch({ type: 'revert-tile', at })}
        />
        <WorldPanel
          seed={present.settings.seed}
          chunkCount={present.settings.chunks.length}
          onSeed={(seed) => dispatch({ type: 'set-seed', seed })}
          onRandomSeed={() => dispatch({ type: 'set-seed', seed: session.randomSeed() })}
          onCopyOverrides={() => copy('overrides.json', serializeWorldOverrides(present.overrides))}
          onCopyWorld={() => copy('world.json', serializeWorldSettings(present.settings))}
        />
      </aside>
    </div>
  )
}
