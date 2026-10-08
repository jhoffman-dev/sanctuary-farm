/**
 * The world editor's state and the reducer that turns UI actions into
 * `@sf/world` edit operations. It decides nothing about the world itself —
 * what an edit means, whether a hotspot may move, what counts as unsaved — it
 * only routes each action to the operation that does, and keeps the history.
 */
import {
  MAX_WORLD_SEED,
  type ChunkCoord,
  type EditHistory,
  type HotspotId,
  type QuarterTurns,
  type TileCoord,
  type TileWorld,
  type WorldDraft,
  type WorldOverrides,
  type WorldSpec,
  amendStep,
  applyEdit,
  buildTileWorld,
  countPendingChanges,
  eraseAt,
  hotspotMoveProblem,
  neighbouringChunks,
  rebuildTileWorld,
  recordStep,
  redo,
  removeEditsAt,
  sameDraft,
  startHistory,
  tileOf,
  undo,
  withChunk,
  withOverrides,
  withSeed,
} from '@sf/world'
import type { WorldEditorSession } from './editor-session'
import { SELECT_TOOL, type Tool, editForTool, nextQuarterTurn } from './editor-tools'

export type EditorState = {
  readonly history: EditHistory<WorldDraft>
  readonly saved: WorldDraft
  /** Always `buildTileWorld` of `history.present`. */
  readonly world: TileWorld
  readonly tool: Tool
  readonly rotation: QuarterTurns
  readonly selected: TileCoord | null
  /** A drag whose first tile made an undo step: the rest of the drag amends that step. */
  readonly strokeOpen: boolean
}

export type EditorAction =
  | { readonly type: 'choose-tool'; readonly tool: Tool }
  | { readonly type: 'rotate' }
  | { readonly type: 'select'; readonly at: TileCoord | null }
  /** The current tool on a tile; `continuing` is every tile of a drag after the first. */
  | { readonly type: 'apply-tool'; readonly at: TileCoord; readonly continuing: boolean }
  | { readonly type: 'move-hotspot'; readonly hotspot: HotspotId; readonly to: TileCoord; readonly continuing: boolean }
  | { readonly type: 'end-stroke' }
  | { readonly type: 'revert-tile'; readonly at: TileCoord }
  | { readonly type: 'set-seed'; readonly seed: number }
  | { readonly type: 'add-chunk'; readonly chunk: ChunkCoord }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'saved'; readonly draft: WorldDraft }

export type EditorReducer = (state: EditorState, action: EditorAction) => EditorState

function specOf(session: WorldEditorSession, draft: WorldDraft): WorldSpec {
  return { seed: draft.settings.seed, anchors: session.anchors, overrides: draft.overrides, rngFor: session.rngFor }
}

export function buildDraftWorld(session: WorldEditorSession, draft: WorldDraft): TileWorld {
  return buildTileWorld(specOf(session, draft), draft.settings.chunks)
}

/** The world for `next`, keeping every chunk of `state.world` the change cannot reach. */
function rebuildDraftWorld(session: WorldEditorSession, state: EditorState, next: WorldDraft): TileWorld {
  const previous = { world: state.world, spec: specOf(session, state.history.present) }
  return rebuildTileWorld(previous, specOf(session, next), next.settings.chunks)
}

export function initialEditorState(session: WorldEditorSession): EditorState {
  return {
    history: startHistory(session.saved),
    saved: session.saved,
    world: buildDraftWorld(session, session.saved),
    tool: SELECT_TOOL,
    rotation: 0,
    selected: null,
    strokeOpen: false,
  }
}

/** How many changes Save would write. */
export function pendingChanges(state: EditorState): number {
  return countPendingChanges(state.saved, state.history.present)
}

export function createEditorReducer(session: WorldEditorSession): EditorReducer {
  const withHistory = (state: EditorState, history: EditHistory<WorldDraft>, strokeOpen: boolean): EditorState => ({
    ...state,
    history,
    strokeOpen,
    world: history.present === state.history.present ? state.world : rebuildDraftWorld(session, state, history.present),
  })

  const commit = (state: EditorState, next: WorldDraft, continuing: boolean): EditorState => {
    if (continuing && state.strokeOpen) return withHistory(state, amendStep(state.history, next), true)
    const history = recordStep(state.history, next, sameDraft)
    return withHistory(state, history, history !== state.history)
  }

  const commitOverrides = (state: EditorState, edit: (spec: WorldSpec) => WorldOverrides, continuing: boolean) => {
    const present = state.history.present
    return commit(state, withOverrides(present, edit(specOf(session, present))), continuing)
  }

  const moveHotspot = (state: EditorState, hotspot: HotspotId, to: TileCoord, continuing: boolean): EditorState =>
    hotspotMoveProblem(state.world, hotspot, to) === null
      ? commitOverrides(state, (spec) => applyEdit(spec, { op: 'move-hotspot', hotspot, to }), continuing)
      : state

  const applyTool = (state: EditorState, at: TileCoord, continuing: boolean): EditorState => {
    const { tool } = state
    if (tool.kind === 'select') return { ...state, selected: at }
    if (tool.kind === 'move-hotspot') return tool.hotspot ? moveHotspot(state, tool.hotspot, at, continuing) : state
    // Nothing to paint off the land; new land comes from `add-chunk`.
    if (tileOf(state.world, at) === undefined) return state
    if (tool.kind === 'erase') return commitOverrides(state, (spec) => eraseAt(spec, at), continuing)
    const edit = editForTool(tool, at, state.rotation)
    return edit ? commitOverrides(state, (spec) => applyEdit(spec, edit), continuing) : state
  }

  const addChunk = (state: EditorState, chunk: ChunkCoord): EditorState => {
    const land = state.history.present.settings.chunks
    const offered = neighbouringChunks(land).some((candidate) => candidate.cx === chunk.cx && candidate.cz === chunk.cz)
    return offered ? commit(state, withChunk(state.history.present, chunk), false) : state
  }

  const setSeed = (state: EditorState, seed: number): EditorState =>
    Number.isSafeInteger(seed) && seed >= 0 && seed <= MAX_WORLD_SEED
      ? commit(state, withSeed(state.history.present, seed), false)
      : state

  return (state, action) => {
    switch (action.type) {
      case 'choose-tool':
        return { ...state, tool: action.tool }
      case 'rotate':
        return { ...state, rotation: nextQuarterTurn(state.rotation) }
      case 'select':
        return { ...state, selected: action.at }
      case 'apply-tool':
        return applyTool(state, action.at, action.continuing)
      case 'move-hotspot':
        return moveHotspot(state, action.hotspot, action.to, action.continuing)
      case 'end-stroke':
        return { ...state, strokeOpen: false }
      case 'revert-tile':
        return commit(state, withOverrides(state.history.present, removeEditsAt(state.history.present.overrides, action.at)), false)
      case 'set-seed':
        return setSeed(state, action.seed)
      case 'add-chunk':
        return addChunk(state, action.chunk)
      case 'undo':
        return withHistory(state, undo(state.history), false)
      case 'redo':
        return withHistory(state, redo(state.history), false)
      case 'saved':
        return { ...state, saved: action.draft }
    }
  }
}
