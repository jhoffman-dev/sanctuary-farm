// STUB — Track C replaces with the walkable tap-to-move farmyard.
import type { FarmyardProps } from '@/contracts'
import { tilemap } from './tilemap'

export function Farmyard({ map = tilemap, onHotspot }: FarmyardProps) {
  return (
    <div data-stub="Farmyard" className="space-y-2 p-4">
      <p className="opacity-60">farmyard stub — {map.width}×{map.height} tiles</p>
      <div className="flex flex-wrap gap-2">
        {map.hotspots.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onHotspot(h.id)}
            className="rounded bg-lime-200 px-3 py-2"
          >
            walk to {h.label}
          </button>
        ))}
      </div>
    </div>
  )
}
