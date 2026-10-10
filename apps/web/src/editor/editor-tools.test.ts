import { describe, expect, it } from 'vitest'
import { isWorldEditorRoute } from './editor-route'
import { editForTool, ghostFor, nextQuarterTurn, sameTool, toolOwnsDrag } from './editor-tools'

const at = { x: 2, z: -3 }

describe('the editor route', () => {
  it('opens only on ?edit=1', () => {
    expect(isWorldEditorRoute('?edit=1')).toBe(true)
    expect(isWorldEditorRoute('?edit=1&perf=1')).toBe(true)
    expect(isWorldEditorRoute('?edit=0')).toBe(false)
    expect(isWorldEditorRoute('')).toBe(false)
  })
})

describe('editForTool', () => {
  it('turns each placing tool into its edit, with the current rotation', () => {
    expect(editForTool({ kind: 'paint-ground', ground: 'dirt' }, at, 2)).toEqual({ op: 'set-ground', at, ground: 'dirt' })
    expect(editForTool({ kind: 'place-structure', structure: 'fence' }, at, 1)).toEqual({ op: 'place-structure', at, kind: 'fence', rotation: 1 })
    expect(editForTool({ kind: 'place-decor', decor: 'tree' }, at, 3)).toEqual({ op: 'place-decor', at, kind: 'tree', rotation: 3 })
  })

  it('has no edit for tools that do not place', () => {
    for (const tool of [{ kind: 'select' }, { kind: 'erase' }, { kind: 'move-hotspot' }, { kind: 'add-land' }] as const) {
      expect(editForTool(tool, at, 0)).toBeNull()
    }
  })
})

describe('ghostFor', () => {
  it('previews ground as ground, pieces as their model, a fence as a straight run, and erase as erase', () => {
    expect(ghostFor({ kind: 'paint-ground', ground: 'water' }, 0)).toEqual({ kind: 'ground', ground: 'water' })
    expect(ghostFor({ kind: 'place-structure', structure: 'fence' }, 1)).toEqual({ kind: 'piece', pieceId: 'fence:straight', rotation: 1 })
    expect(ghostFor({ kind: 'place-structure', structure: 'building-roof' }, 0)).toEqual({ kind: 'piece', pieceId: 'building-roof', rotation: 0 })
    expect(ghostFor({ kind: 'place-decor', decor: 'hay-bale' }, 2)).toEqual({ kind: 'piece', pieceId: 'hay-bale', rotation: 2 })
    expect(ghostFor({ kind: 'erase' }, 0)).toEqual({ kind: 'erase' })
    expect(ghostFor({ kind: 'select' }, 0)).toEqual({ kind: 'none' })
  })
})

describe('tool helpers', () => {
  it('lets the camera have left-drag only in Select and Add land', () => {
    expect(toolOwnsDrag({ kind: 'select' })).toBe(false)
    expect(toolOwnsDrag({ kind: 'add-land' })).toBe(false)
    expect(toolOwnsDrag({ kind: 'erase' })).toBe(true)
    expect(toolOwnsDrag({ kind: 'paint-ground', ground: 'path' })).toBe(true)
  })

  it('turns a quarter at a time and wraps after three', () => {
    expect([0, 1, 2, 3].map((turn) => nextQuarterTurn(turn as 0 | 1 | 2 | 3))).toEqual([1, 2, 3, 0])
  })

  it('compares tools by what they do', () => {
    expect(sameTool({ kind: 'place-decor', decor: 'tree' }, { kind: 'place-decor', decor: 'tree' })).toBe(true)
    expect(sameTool({ kind: 'place-decor', decor: 'tree' }, { kind: 'place-decor', decor: 'rock' })).toBe(false)
  })
})
