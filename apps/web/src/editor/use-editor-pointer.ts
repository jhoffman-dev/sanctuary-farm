import {
  type HotspotId,
  type TileCoord,
  type TileRect,
  type TileWorld,
  chunkOf,
  hotspotAt,
  hotspotMoveProblem,
} from '@sf/world'
import { type Dispatch, useCallback, useRef, useState } from 'react'
import type { EditorAction } from './editor-state'
import type { Tool } from './editor-tools'
import type { SurfacePointer } from './PointerSurface'

/** Further than this between press and release is a camera drag, not a click. */
const CLICK_SLOP_PX = 5
const LEFT_BUTTON = 0

/** A hotspot held by the cursor, and where on its footprint it was picked up. */
type Grab = { readonly hotspot: HotspotId; readonly offset: TileCoord }

type Press = {
  readonly clientX: number
  readonly clientY: number
  readonly grab: Grab | null
  /** The last tile this press acted on, so a drag acts once per tile. */
  last: TileCoord
  moved: boolean
}

/** The footprint a hotspot would take, and whether it may go there. */
export type HotspotGhost = { readonly rect: TileRect; readonly allowed: boolean }

function sameTile(one: TileCoord, other: TileCoord): boolean {
  return one.x === other.x && one.z === other.z
}

function grabAt(world: TileWorld, at: TileCoord): Grab | null {
  const hotspot = hotspotAt(world, at)
  return hotspot ? { hotspot: hotspot.id, offset: { x: at.x - hotspot.footprint.x, z: at.z - hotspot.footprint.z } } : null
}

function hotspotGhostAt(world: TileWorld, hotspot: HotspotId, to: TileCoord): HotspotGhost | null {
  const placed = world.hotspots.find((candidate) => candidate.id === hotspot)
  if (!placed) return null
  const rect = { ...placed.footprint, x: to.x, z: to.z }
  return { rect, allowed: hotspotMoveProblem(world, hotspot, to) === null }
}

type PointerInput = { world: TileWorld; tool: Tool; dispatch: Dispatch<EditorAction> }

/**
 * Turns pointer input on the land into editor actions: a click, a drag that
 * paints tile by tile, a hotspot picked up and carried. It keeps only the
 * gesture in flight; every decision about the world is the reducer's.
 */
export function useEditorPointer({ world, tool, dispatch }: PointerInput) {
  const [hover, setHover] = useState<TileCoord | null>(null)
  const press = useRef<Press | null>(null)
  const [grab, setGrab] = useState<Grab | null>(null)

  const onDown = useCallback(
    (pointer: SurfacePointer) => {
      if (pointer.button !== LEFT_BUTTON) return
      const held = tool.kind === 'move-hotspot' && !tool.hotspot ? grabAt(world, pointer.at) : null
      press.current = { clientX: pointer.clientX, clientY: pointer.clientY, grab: held, last: pointer.at, moved: false }
      setGrab(held)
      if (tool.kind !== 'select' && tool.kind !== 'add-land' && !held) {
        dispatch({ type: 'apply-tool', at: pointer.at, continuing: false })
      }
    },
    [world, tool, dispatch],
  )

  const onMove = useCallback(
    (pointer: SurfacePointer) => {
      setHover((current) => (current && sameTile(current, pointer.at) ? current : pointer.at))
      const held = press.current
      if (!held || sameTile(held.last, pointer.at)) return
      held.last = pointer.at
      if (held.grab) {
        const to = { x: pointer.at.x - held.grab.offset.x, z: pointer.at.z - held.grab.offset.z }
        dispatch({ type: 'move-hotspot', hotspot: held.grab.hotspot, to, continuing: held.moved })
        held.moved = true
      } else if (tool.kind !== 'select' && tool.kind !== 'add-land') {
        dispatch({ type: 'apply-tool', at: pointer.at, continuing: true })
      }
    },
    [tool, dispatch],
  )

  const onUp = useCallback(
    (pointer: SurfacePointer) => {
      const held = press.current
      press.current = null
      setGrab(null)
      if (!held) return
      dispatch({ type: 'end-stroke' })
      const click = Math.hypot(pointer.clientX - held.clientX, pointer.clientY - held.clientY) <= CLICK_SLOP_PX
      if (!click) return
      if (tool.kind === 'select') dispatch({ type: 'select', at: pointer.at })
      if (tool.kind === 'add-land') dispatch({ type: 'add-chunk', chunk: chunkOf(pointer.at) })
    },
    [tool, dispatch],
  )

  const onLeave = useCallback(() => setHover(null), [])

  const carried = grab ?? (tool.kind === 'move-hotspot' && tool.hotspot ? { hotspot: tool.hotspot, offset: { x: 0, z: 0 } } : null)
  const hotspotGhost =
    carried && hover ? hotspotGhostAt(world, carried.hotspot, { x: hover.x - carried.offset.x, z: hover.z - carried.offset.z }) : null

  return { hover, hotspotGhost, handlers: { onDown, onMove, onUp, onLeave } }
}
