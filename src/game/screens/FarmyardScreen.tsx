import { useRef, useState } from 'react'
import type { HotspotId } from '@/contracts'
import { Farmyard } from '@/world/Farmyard'
import { useGame } from '../gameState'
import { ParentGate } from '../ParentGate'
import { MuteButton } from './MuteButton'

export function FarmyardScreen() {
  const { go, choreStalls, pendingHatch, save } = useGame()
  const [showShed, setShowShed] = useState(false)
  const [gate, setGate] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function onHotspot(id: HotspotId) {
    if (id === 'barn') go('barn')
    else if (id === 'nest') go('nest')
    else if (id === 'paddock') go('paddock')
    else if (id === 'farmhouse') go('summary')
    else if (id === 'feedshed') setShowShed(true)
  }

  const holdStart = () => {
    pressTimer.current = setTimeout(() => setGate(true), 650)
  }
  const holdEnd = () => clearTimeout(pressTimer.current)

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Farmyard
        badges={{ barn: choreStalls.length > 0, nest: pendingHatch != null }}
        onHotspot={onHotspot}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-full bg-white/80 px-3 py-1 text-sm shadow">
          🌾 {save.currency.pellets} · 🪙 {save.currency.coins}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <MuteButton />
          <button
            type="button"
            aria-label="Farmhouse sign"
            className="rounded-full bg-white/80 px-3 py-1 text-sm shadow"
            onPointerDown={holdStart}
            onPointerUp={holdEnd}
            onPointerLeave={holdEnd}
          >
            🏡
          </button>
        </div>
      </div>

      {choreStalls.length > 0 ? (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-stone-600">
          The animals are hungry — walk to the barn.
        </p>
      ) : null}

      {showShed ? (
        <div className="absolute inset-0 grid place-items-center bg-stone-900/30 p-6">
          <div className="max-w-xs rounded-xl bg-white p-6 text-center shadow-xl">
            <p className="text-lg font-semibold">Feed shed</p>
            <p className="mt-2 text-4xl">🌾 {save.currency.pellets}</p>
            <p className="text-4xl">🪙 {save.currency.coins}</p>
            <p className="mt-2 text-xs text-stone-500">
              Pellets and coins come only from answering questions.
            </p>
            <button type="button" className="mt-4 rounded-lg bg-stone-200 px-4 py-2" onClick={() => setShowShed(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

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
