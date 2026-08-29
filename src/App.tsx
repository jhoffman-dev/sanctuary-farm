// PHASE 2 owns this file — the real screen graph:
//   farmyard ⇄ barn ⇄ stall,  nest / paddock / feedshed / farmhouse → summary
// Until then it is a stub so the project type-checks and builds.
export function App() {
  return (
    <div className="grid min-h-dvh place-items-center bg-stone-50 text-stone-700">
      <div className="text-center">
        <p className="text-2xl">🌾 Sanctuary Farm</p>
        <p className="mt-2 text-sm opacity-60">
          Game shell — assembled in Phase 2. Add <code>?app=1</code> once wired; for now
          use the dev routes.
        </p>
      </div>
    </div>
  )
}
