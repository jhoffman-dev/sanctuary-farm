// The walkable farmyard. Tap/click a tile to path there (A*); tapping again
// mid-walk re-paths instantly. Arrow keys / WASD are a secondary continuous
// input. No d-pad. Walking fully onto a hotspot tile fires onHotspot(id) once,
// re-armed only after leaving. A dead-zone follow camera tracks the keeper.
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  GRID_H,
  GRID_W,
  MAP_PX_H,
  MAP_PX_W,
  TILE_PX,
  WALK_SPEED_TPS,
} from '@/contracts'
import type {
  CharacterFacing,
  FarmyardProps,
  HotspotId,
  TileType,
  Tilemap,
  Vec2,
} from '@/contracts'
import { cameraOffset } from './camera'
import { Character } from './Character'
import { findPath } from './pathfind'
import { tilemap } from './tilemap'

type Props = FarmyardProps & { debug?: boolean }

const TILE_FILL: Record<TileType, string> = {
  grass: '#8bc24a',
  path: '#d8b477',
  fence: '#6f5038',
  water: '#57b0e4',
  building: '#c05a44',
}

const tileCentre = (t: Vec2): Vec2 => ({
  x: t.x * TILE_PX + TILE_PX / 2,
  y: t.y * TILE_PX + TILE_PX / 2,
})

const pxToTile = (p: Vec2): Vec2 => ({
  x: Math.max(0, Math.min(GRID_W - 1, Math.floor(p.x / TILE_PX))),
  y: Math.max(0, Math.min(GRID_H - 1, Math.floor(p.y / TILE_PX))),
})

function facingFromVec(dx: number, dy: number): CharacterFacing | null {
  if (dx === 0 && dy === 0) return null
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

const KEY_VECTORS: Record<string, Vec2> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
}

/** Free-movement collision: try the full step, then each axis alone. */
function slide(map: Tilemap, from: Vec2, nx: number, ny: number): Vec2 {
  const walkableAt = (p: Vec2) => {
    const t = pxToTile(p)
    return map.isWalkable(t.x, t.y)
  }
  if (walkableAt({ x: nx, y: ny })) return { x: nx, y: ny }
  if (walkableAt({ x: nx, y: from.y })) return { x: nx, y: from.y }
  if (walkableAt({ x: from.x, y: ny })) return { x: from.x, y: ny }
  return from
}

export function Farmyard({ map = tilemap, onHotspot, badges, debug }: Props) {
  const start = tileCentre(map.playerStart)

  const initialCam = cameraOffset(start, { w: MAP_PX_W, h: MAP_PX_H })

  const posRef = useRef<Vec2>(start)
  const pathRef = useRef<Vec2[]>([])
  const keysRef = useRef<Set<string>>(new Set())
  const facingRef = useRef<CharacterFacing>('down')
  const occupiedRef = useRef<HotspotId | null>(null)
  const camRef = useRef<Vec2>(initialCam)
  const viewportRef = useRef({ w: MAP_PX_W, h: MAP_PX_H })
  const onHotspotRef = useRef(onHotspot)

  const containerRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<Vec2>(start)
  const [facing, setFacing] = useState<CharacterFacing>('down')
  const [moving, setMoving] = useState(false)
  const [cam, setCam] = useState<Vec2>(initialCam)
  const [pathView, setPathView] = useState<Vec2[]>([])
  const [hud, setHud] = useState({ fps: 0, tile: map.playerStart })

  const appliedRef = useRef({
    pos: start,
    facing: 'down' as CharacterFacing,
    moving: false,
    cam: initialCam,
    pathLen: 0,
  })

  useEffect(() => {
    onHotspotRef.current = onHotspot
  }, [onHotspot])

  // Reset to the farmhouse door when a different map is supplied (D12).
  const mountedRef = useRef(false)
  useEffect(() => {
    const s = tileCentre(map.playerStart)
    posRef.current = s
    pathRef.current = []
    occupiedRef.current = null
    facingRef.current = 'down'
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setPos(s)
    setPathView([])
  }, [map])

  // Measure the viewport for the camera.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      viewportRef.current = { w: el.clientWidth || MAP_PX_W, h: el.clientHeight || MAP_PX_H }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Secondary input: arrow keys + WASD, held for continuous movement.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k in KEY_VECTORS) {
        keysRef.current.add(k)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // The movement / camera / hotspot loop.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let frames = 0
    let fpsClock = last

    const speed = WALK_SPEED_TPS * TILE_PX

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      frames++

      let p = posRef.current
      let isMoving = false

      let dx = 0
      let dy = 0
      for (const k of keysRef.current) {
        dx += KEY_VECTORS[k].x
        dy += KEY_VECTORS[k].y
      }

      if (dx !== 0 || dy !== 0) {
        pathRef.current = []
        const len = Math.hypot(dx, dy) || 1
        const dist = speed * dt
        p = slide(map, p, p.x + (dx / len) * dist, p.y + (dy / len) * dist)
        isMoving = true
        const f = facingFromVec(dx, dy)
        if (f) facingRef.current = f
      } else if (pathRef.current.length > 0) {
        let budget = speed * dt
        while (budget > 0 && pathRef.current.length > 0) {
          const wp = tileCentre(pathRef.current[0])
          const vx = wp.x - p.x
          const vy = wp.y - p.y
          const d = Math.hypot(vx, vy)
          const f = facingFromVec(vx, vy)
          if (f) facingRef.current = f
          if (d <= budget) {
            p = wp
            budget -= d
            pathRef.current.shift()
          } else {
            p = { x: p.x + (vx / d) * budget, y: p.y + (vy / d) * budget }
            budget = 0
          }
        }
        isMoving = true
      }

      posRef.current = p
      const nextCam = cameraOffset(p, viewportRef.current, camRef.current)
      camRef.current = nextCam

      const applied = appliedRef.current
      if (p.x !== applied.pos.x || p.y !== applied.pos.y) setPos(p)
      if (isMoving !== applied.moving) setMoving(isMoving)
      if (facingRef.current !== applied.facing) setFacing(facingRef.current)
      if (nextCam.x !== applied.cam.x || nextCam.y !== applied.cam.y) setCam(nextCam)
      if (pathRef.current.length !== applied.pathLen) setPathView(pathRef.current.slice())
      appliedRef.current = {
        pos: p,
        facing: facingRef.current,
        moving: isMoving,
        cam: nextCam,
        pathLen: pathRef.current.length,
      }

      // Hotspot: fire once on full arrival, re-arm after leaving the tile.
      const tile = pxToTile(p)
      const hs = map.hotspots.find((h) => h.tile.x === tile.x && h.tile.y === tile.y)
      if (hs) {
        if (occupiedRef.current !== hs.id) {
          occupiedRef.current = hs.id
          onHotspotRef.current(hs.id)
        }
      } else {
        occupiedRef.current = null
      }

      if (debug && now - fpsClock >= 500) {
        setHud({ fps: Math.round((frames * 1000) / (now - fpsClock)), tile })
        frames = 0
        fpsClock = now
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [map, debug])

  const walkTo = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const target = pxToTile({
        x: clientX - rect.left + camRef.current.x,
        y: clientY - rect.top + camRef.current.y,
      })
      const from = pxToTile(posRef.current)
      const path = findPath(map, from, target)
      if (path === null) return // unreachable — do nothing, no throw
      pathRef.current = path
      keysRef.current.clear()
    },
    [map],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => walkTo(e.clientX, e.clientY)

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[#6ba43a]"
      style={{ cursor: 'pointer' }}
    >
      <svg
        width={MAP_PX_W}
        height={MAP_PX_H}
        className="absolute left-0 top-0"
        style={{ transform: `translate(${-cam.x}px, ${-cam.y}px)` }}
        aria-hidden
      >
        {map.tiles.map((t, i) => (
          <rect
            key={i}
            x={(i % map.width) * TILE_PX}
            y={Math.floor(i / map.width) * TILE_PX}
            width={TILE_PX}
            height={TILE_PX}
            fill={TILE_FILL[t]}
          />
        ))}

        {pathView.map((wp, i) => (
          <circle
            key={`wp-${i}`}
            cx={wp.x * TILE_PX + TILE_PX / 2}
            cy={wp.y * TILE_PX + TILE_PX / 2}
            r={4}
            fill="rgba(255,255,255,0.55)"
          />
        ))}

        {map.hotspots.map((h) => (
          <g
            key={h.id}
            transform={`translate(${h.tile.x * TILE_PX + TILE_PX / 2} ${h.tile.y * TILE_PX + TILE_PX / 2})`}
          >
            <circle
              r={TILE_PX * 0.44}
              fill="rgba(255,255,255,0.22)"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={2}
            />
            <text
              y={-TILE_PX * 0.72}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="#2b3a12"
            >
              {h.label}
            </text>
            {badges?.[h.id] ? (
              <circle cx={TILE_PX * 0.42} cy={-TILE_PX * 0.42} r={7} fill="#ef5350" stroke="#fff" strokeWidth={2} />
            ) : null}
          </g>
        ))}

        <g transform={`translate(${pos.x - TILE_PX / 2} ${pos.y - TILE_PX + 6})`}>
          <Character facing={facing} moving={moving} />
        </g>
      </svg>

      {debug ? (
        <div className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 font-mono text-[11px] text-white">
          {hud.fps} fps · tile {hud.tile.x},{hud.tile.y}
        </div>
      ) : null}
    </div>
  )
}
