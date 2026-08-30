// The walkable farmyard. The whole farm is scaled to fit the viewport (no
// scrolling camera) so every hotspot is always on screen. Tap/click a tile to
// path there (A*); tapping again mid-walk re-paths instantly. Arrow keys / WASD
// are a secondary continuous input. No d-pad. Walking fully onto a hotspot tile
// fires onHotspot(id) once, re-armed only after leaving.
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
  Tilemap,
  Vec2,
} from '@/contracts'
import { Character } from './Character'
import { FarmScene } from './FarmScene'
import { findPath } from './pathfind'
import { tilemap } from './tilemap'

type Props = FarmyardProps & {
  debug?: boolean
  /** Where the keeper appears on mount. Defaults to the farmhouse door
   *  (map.playerStart). Phase 2 passes the last hotspot she left from so she
   *  doesn't teleport back across the farm on every screen change. */
  spawnAt?: Vec2
}

/** Chebyshev distance in tiles. */
const chebyshev = (a: Vec2, b: Vec2) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
/** Taps within this many tiles of a hotspot snap to it. */
const HOTSPOT_SNAP_RADIUS = 2

type Fit = { scale: number; ox: number; oy: number }

function fitFor(vw: number, vh: number): Fit {
  const scale = Math.min(vw / MAP_PX_W, vh / MAP_PX_H) || 1
  return {
    scale,
    ox: (vw - MAP_PX_W * scale) / 2,
    oy: (vh - MAP_PX_H * scale) / 2,
  }
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

/** The hotspot occupying a given tile, if any. */
function hotspotAt(map: Tilemap, tile: Vec2): HotspotId | null {
  return map.hotspots.find((h) => h.tile.x === tile.x && h.tile.y === tile.y)?.id ?? null
}

export function Farmyard({ map = tilemap, onHotspot, badges, debug, spawnAt }: Props) {
  const spawnTile = spawnAt ?? map.playerStart
  const start = tileCentre(spawnTile)

  const posRef = useRef<Vec2>(start)
  const pathRef = useRef<Vec2[]>([])
  const keysRef = useRef<Set<string>>(new Set())
  const facingRef = useRef<CharacterFacing>('down')
  // If the player spawns on a hotspot tile (the farmhouse door often is one),
  // treat it as already "occupied" so we don't fire onHotspot for simply
  // standing there — it only fires when she *walks onto* it (see loop below).
  const occupiedRef = useRef<HotspotId | null>(hotspotAt(map, spawnTile))
  const fitRef = useRef<Fit>(fitFor(MAP_PX_W, MAP_PX_H))
  const onHotspotRef = useRef(onHotspot)

  const containerRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<Vec2>(start)
  const [facing, setFacing] = useState<CharacterFacing>('down')
  const [moving, setMoving] = useState(false)
  const [fit, setFit] = useState<Fit>(fitRef.current)
  const [pathView, setPathView] = useState<Vec2[]>([])
  const [hud, setHud] = useState({ fps: 0, tile: spawnTile })

  const appliedRef = useRef({
    pos: start,
    facing: 'down' as CharacterFacing,
    moving: false,
    pathLen: 0,
  })

  useEffect(() => {
    onHotspotRef.current = onHotspot
  }, [onHotspot])

  // Reset the keeper's position when a different map is supplied (D12 — position
  // is not persisted; on a fresh mount she starts at `spawnTile`).
  const mountedRef = useRef(false)
  useEffect(() => {
    const s = tileCentre(spawnTile)
    posRef.current = s
    pathRef.current = []
    occupiedRef.current = hotspotAt(map, spawnTile)
    facingRef.current = 'down'
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setPos(s)
    setPathView([])
    // Depend on `map` only: `spawnTile` is read once here and a navigation change
    // remounts this component (fresh mount branch), so it never needs to re-run
    // for a spawn change alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Keep the whole farm scaled to fit the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const next = fitFor(el.clientWidth || MAP_PX_W, el.clientHeight || MAP_PX_H)
      fitRef.current = next
      setFit(next)
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

  // The movement / hotspot loop.
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

      const applied = appliedRef.current
      if (p.x !== applied.pos.x || p.y !== applied.pos.y) setPos(p)
      if (isMoving !== applied.moving) setMoving(isMoving)
      if (facingRef.current !== applied.facing) setFacing(facingRef.current)
      if (pathRef.current.length !== applied.pathLen) setPathView(pathRef.current.slice())
      appliedRef.current = {
        pos: p,
        facing: facingRef.current,
        moving: isMoving,
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
      const { scale, ox, oy } = fitRef.current
      const tapped = pxToTile({
        x: (clientX - rect.left - ox) / scale,
        y: (clientY - rect.top - oy) / scale,
      })
      // Tapping on or near a hotspot means "take me there" — snap the
      // destination to the hotspot tile so a slightly-off tap still triggers it.
      const nearHotspot = map.hotspots
        .map((h) => ({ h, d: chebyshev(h.tile, tapped) }))
        .filter((x) => x.d <= HOTSPOT_SNAP_RADIUS)
        .sort((a, b) => a.d - b.d)[0]
      const target = nearHotspot ? nearHotspot.h.tile : tapped

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
      className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ cursor: 'pointer' }}
    >
      <svg
        viewBox={`0 0 ${MAP_PX_W} ${MAP_PX_H}`}
        width={MAP_PX_W * fit.scale}
        height={MAP_PX_H * fit.scale}
        className="absolute"
        style={{ left: fit.ox, top: fit.oy, filter: 'drop-shadow(0 10px 30px rgba(30,50,10,0.25))' }}
        aria-hidden
      >
        <FarmScene map={map} />

        {pathView.map((wp, i) => (
          <circle
            key={`wp-${i}`}
            cx={wp.x * TILE_PX + TILE_PX / 2}
            cy={wp.y * TILE_PX + TILE_PX / 2}
            r={4}
            fill="rgba(255,255,255,0.6)"
          />
        ))}

        {map.hotspots.map((h) => {
          const cx = h.tile.x * TILE_PX + TILE_PX / 2
          const cy = h.tile.y * TILE_PX + TILE_PX / 2
          return (
            <g key={h.id} transform={`translate(${cx} ${cy})`}>
              {/* a little wooden signpost */}
              <rect x={-2.5} y={-4} width={5} height={22} rx={2} fill="#8d6e63" />
              <g transform="translate(0 -16)">
                <rect x={-38} y={-11} width={76} height={20} rx={5} fill="#fffdf5" stroke="#8d6e63" strokeWidth={2} />
                <text textAnchor="middle" y={3} fontSize={11} fontWeight={800} fill="#5d4037">
                  {h.label}
                </text>
                {badges?.[h.id] ? (
                  <circle cx={34} cy={-9} r={6} fill="#ef5350" stroke="#fff" strokeWidth={2} />
                ) : null}
              </g>
            </g>
          )
        })}

        <g transform={`translate(${pos.x - TILE_PX / 2} ${pos.y - TILE_PX + 6})`}>
          <Character facing={facing} moving={moving} />
        </g>
      </svg>

      {debug ? (
        <div className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 font-mono text-[11px] text-white">
          {hud.fps} fps · tile {hud.tile.x},{hud.tile.y} · scale {fit.scale.toFixed(2)}
        </div>
      ) : null}
    </div>
  )
}
