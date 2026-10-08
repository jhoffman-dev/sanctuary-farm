import { act, renderHook } from '@testing-library/react'
import type { TileCoord } from '@sf/world'
import { describe, expect, it, vi } from 'vitest'
import { initialEditorState } from './editor-state'
import type { Tool } from './editor-tools'
import { testSession } from './test-fixtures'
import { useEditorPointer } from './use-editor-pointer'

const { world } = initialEditorState(testSession())
const farmhouse = world.hotspots.find((hotspot) => hotspot.id === 'farmhouse')!
const barn = world.hotspots.find((hotspot) => hotspot.id === 'barn')!

function pointer(at: TileCoord, clientX = 100, clientY = 100, button = 0) {
  return { at, button, clientX, clientY }
}

function setup(tool: Tool) {
  const dispatch = vi.fn()
  const hook = renderHook(() => useEditorPointer({ world, tool, dispatch }))
  return { dispatch, hook, handlers: () => hook.result.current.handlers }
}

describe('useEditorPointer', () => {
  it('paints the first tile on press and each new tile of a drag once, then ends the stroke', () => {
    const { dispatch, handlers } = setup({ kind: 'paint-ground', ground: 'dirt' })
    act(() => handlers().onDown(pointer({ x: 0, z: 0 })))
    act(() => handlers().onMove(pointer({ x: 0, z: 0 })))
    act(() => handlers().onMove(pointer({ x: 1, z: 0 })))
    act(() => handlers().onUp(pointer({ x: 1, z: 0 }, 160)))
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: 'apply-tool', at: { x: 0, z: 0 }, continuing: false },
      { type: 'apply-tool', at: { x: 1, z: 0 }, continuing: true },
      { type: 'end-stroke' },
    ])
  })

  it('selects on a click but not at the end of a camera drag', () => {
    const { dispatch, handlers } = setup({ kind: 'select' })
    act(() => handlers().onDown(pointer({ x: 2, z: 2 })))
    act(() => handlers().onUp(pointer({ x: 2, z: 2 }, 102, 101)))
    act(() => handlers().onDown(pointer({ x: 2, z: 2 })))
    act(() => handlers().onUp(pointer({ x: 5, z: 2 }, 300)))
    expect(dispatch).toHaveBeenCalledWith({ type: 'select', at: { x: 2, z: 2 } })
    expect(dispatch.mock.calls.filter(([action]) => action.type === 'select')).toHaveLength(1)
  })

  it('adds the chunk under a click with the Add land tool', () => {
    const { dispatch, handlers } = setup({ kind: 'add-land' })
    act(() => handlers().onDown(pointer({ x: 20, z: 3 })))
    act(() => handlers().onUp(pointer({ x: 20, z: 3 })))
    expect(dispatch).toHaveBeenCalledWith({ type: 'add-chunk', chunk: { cx: 1, cz: 0 } })
  })

  it('ignores every button but the left one', () => {
    const { dispatch, handlers } = setup({ kind: 'erase' })
    act(() => handlers().onDown(pointer({ x: 0, z: 0 }, 100, 100, 2)))
    act(() => handlers().onUp(pointer({ x: 0, z: 0 })))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('carries a hotspot by the tile it was picked up on, and shows where it would land', () => {
    const { dispatch, hook, handlers } = setup({ kind: 'move-hotspot' })
    const grip = { x: farmhouse.footprint.x + 1, z: farmhouse.footprint.z + 1 }
    act(() => handlers().onDown(pointer(grip)))
    act(() => handlers().onMove(pointer({ x: grip.x, z: grip.z + 1 })))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'move-hotspot',
      hotspot: 'farmhouse',
      to: { x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 },
      continuing: false,
    })
    expect(hook.result.current.hotspotGhost?.rect).toMatchObject({ x: farmhouse.footprint.x, z: farmhouse.footprint.z + 1 })
  })

  it('previews a palette hotspot in red where it may not go', () => {
    const { hook, handlers } = setup({ kind: 'move-hotspot', hotspot: 'farmhouse' })
    act(() => handlers().onMove(pointer({ x: barn.footprint.x, z: barn.footprint.z })))
    expect(hook.result.current.hotspotGhost).toMatchObject({ allowed: false })
    act(() => handlers().onLeave())
    expect(hook.result.current.hover).toBeNull()
  })
})
