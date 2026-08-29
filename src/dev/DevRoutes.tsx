// Hash-router index of every track's dev route. This is the app entry during
// development (main.tsx renders it). Phase 2 swaps main.tsx to render <App/>.
import { useSyncExternalStore } from 'react'
import { devRoutes } from './routes/_registry'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
function getHash() {
  return window.location.hash || '#/dev'
}

export function DevRoutes() {
  const hash = useSyncExternalStore(subscribe, getHash)
  const active = devRoutes.find((r) => r.path === hash)

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <a href="#/dev" className="font-semibold">
          🌾 Sanctuary Farm — dev routes
        </a>
      </header>
      <div className="mx-auto flex max-w-5xl gap-6 p-4">
        <nav className="w-52 shrink-0 space-y-1">
          {devRoutes.map((r) => (
            <a
              key={r.path}
              href={r.path}
              className={`block rounded px-3 py-2 text-sm ${
                r.path === hash ? 'bg-stone-900 text-white' : 'hover:bg-stone-200'
              }`}
            >
              {r.label}
            </a>
          ))}
          {devRoutes.length === 0 ? (
            <p className="text-sm text-stone-500">No routes registered.</p>
          ) : null}
        </nav>
        <main className="min-w-0 flex-1">
          {active ? (
            <active.Component />
          ) : (
            <div className="text-stone-600">
              <p>Select a dev route.</p>
              <ul className="mt-2 list-inside list-disc text-sm">
                {devRoutes.map((r) => (
                  <li key={r.path}>
                    <code>{r.path}</code> — {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
