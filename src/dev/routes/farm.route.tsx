// TRACK C owns this file. Renders the walkable Farmyard at real tile size.
// Hotspots log their id instead of navigating (D10 — tracks never navigate).
import type { DevRoute } from './_registry'
import { Farmyard } from '@/world/Farmyard'

function FarmDevRoute() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-600">
        Tap a tile to walk there (A* paths around fences, water and buildings). Tapping again
        mid-walk re-paths instantly. Arrow keys / WASD move too. Walking onto a hotspot logs it.
      </p>
      <div className="h-[72vh] w-full overflow-hidden rounded-lg border border-stone-300">
        <Farmyard
          debug
          badges={{ barn: true }}
          onHotspot={(id) => console.log('hotspot', id)}
        />
      </div>
    </div>
  )
}

export default {
  path: '#/dev/farm',
  label: 'Farmyard',
  order: 30,
  Component: FarmDevRoute,
} satisfies DevRoute
