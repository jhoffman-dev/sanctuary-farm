import type { Ceiling } from './export_size.ts'

// The Godot web export's size ceilings — docs/performance-budget.md, "Load —
// Godot client". Brotli bytes, because that is what Chrome and Safari get
// from Hosting. Change a number here and in the doc together.
const MB = 1_000_000

const isEngine = (name: string): boolean => /\.(wasm|js)$/.test(name)
const isPack = (name: string): boolean => name.endsWith('.pck')

export const EXPORT_CEILINGS: readonly Ceiling[] = [
  { label: 'Engine download (wasm + loader)', includes: isEngine, maxBrotliBytes: 5 * MB },
  { label: 'Game pack (.pck: scenes, models, audio)', includes: isPack, maxBrotliBytes: 2.5 * MB },
]
