import type { QuarterTurns } from '@sf/world'
import type { ReactNode } from 'react'
import type { Tool } from './editor-tools'

export type SaveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly message: string }
  | { readonly kind: 'failed'; readonly reason: string }

type EditorToolbarProps = {
  tool: Tool
  rotation: QuarterTurns
  topDown: boolean
  canUndo: boolean
  canRedo: boolean
  unsaved: number
  status: SaveStatus
  onTool: (tool: Tool) => void
  onRotate: () => void
  onGameCamera: () => void
  onTopDown: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
}

type ToolButtonProps = { testId: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }

function ToolButton({ testId, pressed, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 font-semibold whitespace-nowrap disabled:opacity-40 ${
        pressed ? 'bg-sky-600 text-white' : 'bg-white hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  )
}

function StatusText({ status }: { status: SaveStatus }) {
  if (status.kind === 'idle') return null
  const text = status.kind === 'saving' ? 'Saving…' : status.kind === 'saved' ? status.message : `Not saved: ${status.reason}`
  const colour = status.kind === 'failed' ? 'text-red-700' : 'text-stone-600'
  return (
    <span role="status" data-testid="save-status" className={`max-w-80 truncate ${colour}`} title={text}>
      {text}
    </span>
  )
}

/** Tools, camera, history and Save — the row across the top of the view. */
export function EditorToolbar(props: EditorToolbarProps) {
  const { tool, rotation, topDown, canUndo, canRedo, unsaved, status } = props
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-stone-100/95 p-1 text-xs shadow">
      <ToolButton testId="tool-select" pressed={tool.kind === 'select'} onClick={() => props.onTool({ kind: 'select' })}>
        Select <kbd>V</kbd>
      </ToolButton>
      <ToolButton testId="tool-erase" pressed={tool.kind === 'erase'} onClick={() => props.onTool({ kind: 'erase' })}>
        Erase <kbd>E</kbd>
      </ToolButton>
      <ToolButton testId="tool-move-hotspot" pressed={tool.kind === 'move-hotspot' && !tool.hotspot} onClick={() => props.onTool({ kind: 'move-hotspot' })}>
        Move hotspot <kbd>M</kbd>
      </ToolButton>
      <ToolButton testId="tool-add-land" pressed={tool.kind === 'add-land'} onClick={() => props.onTool({ kind: 'add-land' })}>
        Add land <kbd>L</kbd>
      </ToolButton>
      <ToolButton testId="rotate" onClick={props.onRotate}>
        Rotate {rotation * 90}° <kbd>R</kbd>
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-stone-300" />
      <ToolButton testId="game-camera" onClick={props.onGameCamera}>
        Game camera <kbd>G</kbd>
      </ToolButton>
      <ToolButton testId="top-down" pressed={topDown} onClick={props.onTopDown}>
        Top-down <kbd>T</kbd>
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-stone-300" />
      <ToolButton testId="undo" disabled={!canUndo} onClick={props.onUndo}>
        Undo
      </ToolButton>
      <ToolButton testId="redo" disabled={!canRedo} onClick={props.onRedo}>
        Redo
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-stone-300" />
      <span data-testid="unsaved-count" data-count={unsaved} className={unsaved > 0 ? 'font-bold text-amber-800' : 'text-stone-500'}>
        {unsaved === 0 ? 'No unsaved changes' : `${unsaved} unsaved change${unsaved === 1 ? '' : 's'}`}
      </span>
      <button
        type="button"
        data-testid="save"
        disabled={status.kind === 'saving'}
        onClick={props.onSave}
        className="rounded bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save <kbd className="font-normal">⌘S</kbd>
      </button>
      <StatusText status={status} />
    </div>
  )
}
