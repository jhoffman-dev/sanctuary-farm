// TRACK C owns this file. Render the walkable Farmyard; hotspots log to console.
import type { DevRoute } from './_registry'
import { Farmyard } from '@/world/Farmyard'

function FarmDevRoute() {
  return <Farmyard onHotspot={(id) => console.log('hotspot', id)} />
}

export default {
  path: '#/dev/farm',
  label: 'Farmyard',
  order: 30,
  Component: FarmDevRoute,
} satisfies DevRoute
