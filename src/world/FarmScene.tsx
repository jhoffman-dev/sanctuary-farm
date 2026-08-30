// The pretty layer of the farmyard — a hand-composed storybook scene drawn over
// the (invisible) collision grid. All coordinates are in map pixels so it sits
// under the same <svg> viewBox as the character.
import type { ReactNode } from 'react'
import { MAP_PX_H, MAP_PX_W, TILE_PX, createRng } from '@/contracts'
import type { Tilemap } from '@/contracts'

const T = TILE_PX
const px = (tiles: number) => tiles * T

/** Rounded blob path through a set of points — used for the dirt paths. */
function grassTufts() {
  const r = createRng(7)
  const tufts: ReactNode[] = []
  for (let i = 0; i < 90; i++) {
    const x = 40 + r() * (MAP_PX_W - 80)
    const y = 40 + r() * (MAP_PX_H - 80)
    const s = 3 + r() * 4
    const c = r() > 0.5 ? '#7cb342' : '#9ccc65'
    tufts.push(
      <path
        key={`t${i}`}
        d={`M${x} ${y} q ${-s} ${-s * 2} 0 ${-s * 3} q ${s} ${s} ${s} ${s * 3} z`}
        fill={c}
        opacity={0.5}
      />,
    )
  }
  return tufts
}

function flowers() {
  const r = createRng(21)
  const out: ReactNode[] = []
  const cols = ['#ef5350', '#ffee58', '#ab47bc', '#fff']
  for (let i = 0; i < 26; i++) {
    const x = 60 + r() * (MAP_PX_W - 120)
    const y = 60 + r() * (MAP_PX_H - 120)
    const col = cols[Math.floor(r() * cols.length)]
    out.push(
      <g key={`f${i}`} transform={`translate(${x} ${y})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={Math.cos((a * Math.PI) / 180) * 4}
            cy={Math.sin((a * Math.PI) / 180) * 4}
            r={2.6}
            fill={col}
          />
        ))}
        <circle r={2.2} fill="#ffca28" />
      </g>,
    )
  }
  return out
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={6} rx={26} ry={7} fill="#00000018" />
      <rect x={-6} y={-18} width={12} height={26} rx={4} fill="#8d6e63" />
      <circle cx={0} cy={-34} r={26} fill="#66bb6a" />
      <circle cx={-16} cy={-24} r={18} fill="#7cb342" />
      <circle cx={16} cy={-26} r={17} fill="#81c784" />
    </g>
  )
}

function Barn({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const roof = h * 0.42
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={w / 2} cy={h + 6} rx={w * 0.55} ry={10} fill="#00000022" />
      <rect x={0} y={roof} width={w} height={h - roof} rx={6} fill="#c0392b" />
      <rect x={0} y={roof} width={w} height={h - roof} rx={6} fill="url(#barnPlanks)" opacity={0.25} />
      <path d={`M${-8} ${roof + 4} L${w / 2} ${-6} L${w + 8} ${roof + 4} Z`} fill="#a93226" />
      <path d={`M${-8} ${roof + 4} L${w / 2} ${-6} L${w + 8} ${roof + 4} Z`} fill="none" stroke="#fff" strokeWidth={3} opacity={0.5} />
      {/* doors */}
      <rect x={w * 0.28} y={h * 0.5} width={w * 0.44} height={h * 0.5} rx={3} fill="#e8c39e" />
      <line x1={w / 2} y1={h * 0.5} x2={w / 2} y2={h} stroke="#a9743f" strokeWidth={3} />
      <path d={`M${w * 0.28} ${h * 0.58} L${w * 0.5} ${h * 0.5} L${w * 0.72} ${h * 0.58}`} stroke="#fff" strokeWidth={3} fill="none" opacity={0.7} />
      {/* hayloft */}
      <circle cx={w / 2} cy={roof - 2} r={7} fill="#fff" opacity={0.85} />
    </g>
  )
}

function Shed({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={w / 2} cy={h + 5} rx={w * 0.55} ry={8} fill="#00000022" />
      <rect x={0} y={h * 0.3} width={w} height={h * 0.7} rx={4} fill="#c9a06a" />
      <path d={`M${-6} ${h * 0.32} L${w + 6} ${h * 0.12} L${w + 6} ${h * 0.3} L${-6} ${h * 0.5} Z`} fill="#8d6e63" />
      <rect x={w * 0.3} y={h * 0.5} width={w * 0.4} height={h * 0.5} rx={2} fill="#6d4c41" />
      <circle cx={w / 2} cy={h * 0.75} r={3} fill="#ffca28" />
    </g>
  )
}

function House({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const roof = h * 0.4
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={w / 2} cy={h + 6} rx={w * 0.55} ry={10} fill="#00000022" />
      <rect x={0} y={roof} width={w} height={h - roof} rx={6} fill="#f5e0c3" />
      <path d={`M${-10} ${roof + 2} L${w / 2} ${-8} L${w + 10} ${roof + 2} Z`} fill="#7d5a44" />
      <rect x={w * 0.68} y={-2} width={10} height={roof * 0.7} fill="#6d4c41" />
      <rect x={w * 0.4} y={h * 0.55} width={w * 0.24} height={h * 0.45} rx={3} fill="#a9743f" />
      <circle cx={w * 0.6} cy={h * 0.78} r={2.4} fill="#ffca28" />
      <rect x={w * 0.12} y={h * 0.5} width={w * 0.2} height={w * 0.2} rx={3} fill="#bcd8e6" stroke="#fff" strokeWidth={2} />
    </g>
  )
}

function Pond({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 6} ry={h / 2 + 4} fill="#7cb342" opacity={0.5} />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#4fc3f7" />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#29b6f6" opacity={0.4} />
      <ellipse cx={w * 0.38} cy={h * 0.4} rx={w * 0.18} ry={h * 0.09} fill="#fff" opacity={0.4} />
      <ellipse cx={w * 0.66} cy={h * 0.62} rx={12} ry={7} fill="#66bb6a" />
    </g>
  )
}

const POST = '#7d5c3f'
const RAIL_HI = '#cfa070'
const RAIL_LO = '#b1855c'

/** A post-and-rail fence segment running east–west (rails horizontal). */
function fenceEW(key: string, cx: number, cy: number) {
  return (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      <rect x={-3} y={-16} width={6} height={26} rx={2} fill={POST} />
      <rect x={T / 2 - 3} y={-16} width={6} height={26} rx={2} fill={POST} />
      <rect x={-T / 2} y={-12} width={T + 6} height={5} rx={2} fill={RAIL_HI} />
      <rect x={-T / 2} y={-3} width={T + 6} height={5} rx={2} fill={RAIL_LO} />
    </g>
  )
}

/** A post-and-rail fence segment running north–south (rails vertical). */
function fenceNS(key: string, cx: number, cy: number) {
  return (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      <rect x={-16} y={-3} width={26} height={6} rx={2} fill={POST} />
      <rect x={-16} y={T / 2 - 3} width={26} height={6} rx={2} fill={POST} />
      <rect x={-12} y={-T / 2} width={5} height={T + 6} rx={2} fill={RAIL_HI} />
      <rect x={-3} y={-T / 2} width={5} height={T + 6} rx={2} fill={RAIL_LO} />
    </g>
  )
}

function fenceRailsFor(map: Tilemap) {
  const rails: ReactNode[] = []
  const isFence = (x: number, y: number) => map.at(x, y) === 'fence'
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      if (!isFence(x, y)) continue
      const cx = px(x) + T / 2
      const cy = px(y) + T / 2
      // Orient by how the run continues. Vertical run → vertical rails.
      const vertical = (isFence(x, y - 1) || isFence(x, y + 1)) && !(isFence(x - 1, y) || isFence(x + 1, y))
      rails.push(
        vertical ? fenceNS(`fn${x}-${y}`, cx, cy) : fenceEW(`fn${x}-${y}`, cx, cy),
      )
    }
  }
  return rails
}

function pathShapesFor(map: Tilemap) {
  const cells: ReactNode[] = []
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.at(x, y) !== 'path') continue
      cells.push(
        <rect
          key={`p${x}-${y}`}
          x={px(x) - 1}
          y={px(y) - 1}
          width={T + 2}
          height={T + 2}
          rx={14}
          fill="#d7b98c"
        />,
      )
    }
  }
  return cells
}

/** A low rail fence framing the pond area — the petting zoo. */
function PettingZooFence() {
  const x0 = px(1) + 6
  const x1 = px(8) - 6
  const y0 = px(11) + 8
  const y1 = px(16)
  const seg = (a: number, b: number, c: number, d: number, key: string) => (
    <g key={key}>
      <line x1={a} y1={b} x2={c} y2={d} stroke={POST} strokeWidth={7} strokeLinecap="round" />
      <line x1={a} y1={b + 8} x2={c} y2={d + 8} stroke={RAIL_HI} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
  return (
    <g opacity={0.95}>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={10} fill="#aed581" opacity={0.35} />
      {/* posts */}
      {[x0, (x0 + x1) / 2, x1].map((px2, i) => (
        <rect key={i} x={px2 - 3} y={y0 - 6} width={6} height={y1 - y0 + 10} rx={2} fill={POST} />
      ))}
      {seg(x0, y0, x1 - px(1.4), y0, 'top-left')}
      {seg(x1 - px(0.6), y0, x1, y0, 'top-right')}
      {seg(x1, y0, x1, y1, 'right')}
    </g>
  )
}

function TrainingRing() {
  const cx = px(11) + T / 2
  const cy = px(3) + T / 2
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse rx={30} ry={20} fill="#d7b98c" />
      <ellipse rx={30} ry={20} fill="none" stroke="#b98a5a" strokeWidth={3} strokeDasharray="6 5" />
      <ellipse rx={16} ry={10} fill="#c8a877" />
    </g>
  )
}

function Nest({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={8} rx={34} ry={10} fill="#00000018" />
      <ellipse cx={0} cy={0} rx={30} ry={18} fill="#a1743c" />
      <ellipse cx={0} cy={-2} rx={22} ry={12} fill="#c9a06a" />
      <ellipse cx={-7} cy={-3} rx={7} ry={9} fill="#fff8e1" />
      <ellipse cx={8} cy={-1} rx={7} ry={9} fill="#e8f0d8" />
    </g>
  )
}

export function FarmScene({ map }: { map: Tilemap }) {
  return (
    <g>
      <defs>
        <linearGradient id="barnPlanks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff9c4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground */}
      <rect x={0} y={0} width={MAP_PX_W} height={MAP_PX_H} rx={40} fill="#8bc34a" />
      <rect x={T} y={T} width={MAP_PX_W - 2 * T} height={MAP_PX_H - 2 * T} rx={28} fill="#9ccc65" />
      <circle cx={MAP_PX_W * 0.82} cy={MAP_PX_H * 0.12} r={200} fill="url(#sun)" />
      {grassTufts()}
      {flowers()}

      {/* paths */}
      {pathShapesFor(map)}

      {/* petting-zoo enclosure around the pond (decorative) */}
      <PettingZooFence />

      {/* training ring on the centre path */}
      <TrainingRing />

      {/* water */}
      <Pond x={px(3)} y={px(12)} w={px(3)} h={px(3)} />

      {/* fences */}
      {fenceRailsFor(map)}

      {/* buildings */}
      <Barn x={px(3)} y={px(3.4)} w={px(4)} h={px(4.6)} />
      <Shed x={px(8)} y={px(4)} w={px(3)} h={px(4)} />
      <House x={px(10)} y={px(11.6)} w={px(4)} h={px(4.4)} />
      <Nest x={px(18) + T / 2} y={px(3) + T / 2} />

      {/* decorative trees + bushes */}
      <Tree x={px(22)} y={px(2) + 20} s={1.05} />
      <Tree x={px(22)} y={px(15)} s={0.85} />
      <Tree x={px(2) + 16} y={px(3) + 6} s={0.8} />
      <circle cx={px(13)} cy={px(9) + 20} r={10} fill="#81c784" />
    </g>
  )
}
