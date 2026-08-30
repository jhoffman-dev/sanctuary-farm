import { useMemo, useRef, useState } from 'react'
import type { HotspotId, Vec2 } from '@/contracts'
import { Farmyard } from '@/world/Farmyard'
import { tilemap } from '@/world/tilemap'
import { useGame } from '../gameState'
import { ParentGate } from '../ParentGate'
import { MuteButton } from './MuteButton'

export function FarmyardScreen() {
  const { go, enterHotspot, choreFamilies, allChoresDone, pendingHatch, lastHotspot, save } =
    useGame()
  const [gate, setGate] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const spawnAt: Vec2 | undefined = useMemo(() => {
    if (!lastHotspot) return undefined
    return tilemap.hotspots.find((h) => h.id === lastHotspot)?.tile
  }, [lastHotspot])

  function onHotspot(id: HotspotId) {
    if (id === 'barn') enterHotspot(id, 'barn')
    else if (id === 'nest') enterHotspot(id, 'nest')
    else if (id === 'paddock') enterHotspot(id, 'paddock')
    else if (id === 'feedshed') enterHotspot(id, 'feedshed')
    else if (id === 'farmhouse') enterHotspot(id, 'summary')
  }

  const holdStart = () => {
    pressTimer.current = setTimeout(() => setGate(true), 650)
  }
  const holdEnd = () => clearTimeout(pressTimer.current)

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-lime-200">
      {/* drifting clouds in the sky band above/around the farm */}
      <div className="pointer-events-none absolute left-[8%] top-[6%] h-10 w-28 rounded-full bg-white/80 blur-[1px]" />
      <div className="pointer-events-none absolute right-[14%] top-[12%] h-8 w-20 rounded-full bg-white/70 blur-[1px]" />
      <div className="pointer-events-none absolute left-[38%] top-[3%] h-7 w-24 rounded-full bg-white/60 blur-[1px]" />

      <Farmyard
        spawnAt={spawnAt}
        badges={{ barn: !allChoresDone, nest: pendingHatch != null }}
        onHotspot={onHotspot}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-full bg-white/85 px-3 py-1 text-sm shadow">
          🪙 {save.coins} &nbsp;·&nbsp; 🌾 {save.feed}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <MuteButton />
          <button
            type="button"
            aria-label="Farmhouse sign"
            className="rounded-full bg-white/85 px-3 py-1 text-sm shadow"
            onPointerDown={holdStart}
            onPointerUp={holdEnd}
            onPointerLeave={holdEnd}
          >
            🏡
          </button>
        </div>
      </div>

      {!allChoresDone ? (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-stone-700">
          {choreFamilies.length === 1
            ? 'An animal still needs care — walk to the barn.'
            : `${choreFamilies.length} animals still need care — walk to the barn.`}
        </p>
      ) : (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-stone-600">
          Everyone is cared for today. 🌙
        </p>
      )}

      {gate ? (
        <ParentGate
          save={save}
          onPass={() => {
            setGate(false)
            go('dashboard')
          }}
          onCancel={() => setGate(false)}
        />
      ) : null}
    </div>
  )
}
