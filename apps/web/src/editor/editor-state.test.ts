import { type Tile, type TileCoord, type TileWorld, hotspotAt, tileOf, tilesOfChunk } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { type EditorAction, type EditorState, createEditorReducer, initialEditorState, pendingChanges } from './editor-state'
import { testSession } from './test-fixtures'

const session = testSession()
const reduce = createEditorReducer(session)
const start = initialEditorState(session)

function run(...actions: EditorAction[]): EditorState {
  return actions.reduce(reduce, start)
}

function bareGrassTiles(world: TileWorld, count: number): TileCoord[] {
  return world.chunks
    .flatMap((chunk) => tilesOfChunk(chunk.coord).map((at, index) => ({ at, tile: chunk.tiles[index] as Tile })))
    .filter(({ at, tile }) => tile.ground.kind === 'grass' && !tile.structure && !tile.decor && !hotspotAt(world, at))
    .slice(0, count)
    .map(({ at }) => at)
}

const [first, second, third] = bareGrassTiles(start.world, 3) as [TileCoord, TileCoord, TileCoord]
const dirt = { type: 'choose-tool', tool: { kind: 'paint-ground', ground: 'dirt' } } as const
const farmhouse = start.world.hotspots.find((hotspot) => hotspot.id === 'farmhouse')!
const oneSouth = { x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 }

describe('the editor reducer', () => {
  it('starts on the saved world with nothing unsaved and the Select tool', () => {
    expect(pendingChanges(start)).toBe(0)
    expect(start.tool).toEqual({ kind: 'select' })
    expect(start.world.chunks).toHaveLength(session.saved.settings.chunks.length)
  })

  it('selects with the Select tool', () => {
    expect(run({ type: 'apply-tool', at: first, continuing: false }).selected).toEqual(first)
    expect(run({ type: 'select', at: first }, { type: 'select', at: null }).selected).toBeNull()
  })

  it('paints, rebuilds the world, counts the change, and undoes and redoes it', () => {
    const painted = run(dirt, { type: 'apply-tool', at: first, continuing: false })
    expect(tileOf(painted.world, first)?.ground.kind).toBe('dirt')
    expect(pendingChanges(painted)).toBe(1)
    const undone = reduce(painted, { type: 'undo' })
    expect(tileOf(undone.world, first)?.ground.kind).toBe('grass')
    expect(pendingChanges(undone)).toBe(0)
    expect(tileOf(reduce(undone, { type: 'redo' }).world, first)?.ground.kind).toBe('dirt')
  })

  it('makes one drag one undo step', () => {
    const stroke = run(
      dirt,
      { type: 'apply-tool', at: first, continuing: false },
      { type: 'apply-tool', at: second, continuing: true },
      { type: 'apply-tool', at: third, continuing: true },
      { type: 'end-stroke' },
    )
    expect(pendingChanges(stroke)).toBe(3)
    expect(pendingChanges(reduce(stroke, { type: 'undo' }))).toBe(0)
  })

  it('never folds a new drag into the step before it when its first tile changed nothing', () => {
    const before = run(dirt, { type: 'apply-tool', at: first, continuing: false }, { type: 'end-stroke' })
    const grass = { type: 'choose-tool', tool: { kind: 'paint-ground', ground: 'grass' } } as const
    const stroke = [grass, { type: 'apply-tool', at: second, continuing: false }, dirt, { type: 'apply-tool', at: third, continuing: true }] as const
    const after = stroke.reduce(reduce, before)
    const undone = reduce(after, { type: 'undo' })
    expect(tileOf(undone.world, first)?.ground.kind).toBe('dirt')
    expect(tileOf(undone.world, third)?.ground.kind).toBe('grass')
  })

  it('ignores tools off the land', () => {
    const offLand = { x: 500, z: 500 }
    expect(run(dirt, { type: 'apply-tool', at: offLand, continuing: false }).history).toBe(start.history)
  })

  it('places with the current rotation, erases what it placed, and leaves no override behind', () => {
    const fence = { type: 'choose-tool', tool: { kind: 'place-structure', structure: 'fence' } } as const
    const placed = run(fence, { type: 'rotate' }, { type: 'apply-tool', at: first, continuing: false })
    expect(placed.history.present.overrides.edits).toEqual([{ op: 'place-structure', at: first, kind: 'fence', rotation: 1 }])
    const erased = [{ type: 'end-stroke' }, { type: 'choose-tool', tool: { kind: 'erase' } }, { type: 'apply-tool', at: first, continuing: false }] as const
    expect(erased.reduce(reduce, placed).history.present.overrides.edits).toEqual([])
  })

  it('moves a hotspot chosen in the palette, and refuses a move onto another hotspot', () => {
    const moveTool = { type: 'choose-tool', tool: { kind: 'move-hotspot', hotspot: 'farmhouse' } } as const
    const moved = run(moveTool, { type: 'apply-tool', at: oneSouth, continuing: false })
    expect(moved.world.hotspots.find((hotspot) => hotspot.id === 'farmhouse')?.footprint).toMatchObject(oneSouth)
    const barn = start.world.hotspots.find((hotspot) => hotspot.id === 'barn')!
    const refused = run(moveTool, { type: 'apply-tool', at: { x: barn.footprint.x, z: barn.footprint.z }, continuing: false })
    expect(refused.history).toBe(start.history)
  })

  it('does nothing with the drag-a-hotspot tool on its own, which moves through move-hotspot actions', () => {
    expect(run({ type: 'choose-tool', tool: { kind: 'move-hotspot' } }, { type: 'apply-tool', at: first, continuing: false }).history).toBe(start.history)
    const dragged = run({ type: 'move-hotspot', hotspot: 'farmhouse', to: oneSouth, continuing: false })
    expect(dragged.history.present.overrides.edits).toEqual([{ op: 'move-hotspot', hotspot: 'farmhouse', to: oneSouth }])
  })

  it('adds land only beside the land', () => {
    const grown = run({ type: 'add-chunk', chunk: { cx: 1, cz: 0 } })
    expect(grown.world.chunks).toHaveLength(start.world.chunks.length + 1)
    expect(pendingChanges(grown)).toBe(1)
    expect(run({ type: 'add-chunk', chunk: { cx: 5, cz: 5 } }).history).toBe(start.history)
  })

  it('regenerates from a new seed and keeps the overrides', () => {
    const reseeded = run(dirt, { type: 'apply-tool', at: first, continuing: false }, { type: 'set-seed', seed: 7 })
    expect(reseeded.world.seed).toBe(7)
    expect(reseeded.history.present.overrides.edits).toHaveLength(1)
    expect(run({ type: 'set-seed', seed: -1 }).history).toBe(start.history)
    expect(run({ type: 'set-seed', seed: 1.5 }).history).toBe(start.history)
  })

  it('reverts one tile to generated', () => {
    const reverted = run(dirt, { type: 'apply-tool', at: first, continuing: false }, { type: 'revert-tile', at: first })
    expect(reverted.history.present.overrides.edits).toEqual([])
  })

  it('counts nothing unsaved once saved', () => {
    const painted = run(dirt, { type: 'apply-tool', at: first, continuing: false })
    expect(pendingChanges(reduce(painted, { type: 'saved', draft: painted.history.present }))).toBe(0)
  })
})
