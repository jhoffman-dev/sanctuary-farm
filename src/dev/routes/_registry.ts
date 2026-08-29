// Dev-route registry. Each track owns exactly ONE file: src/dev/routes/<track>.route.tsx
// exporting `default` as a DevRoute. No track ever edits a shared file to register —
// this glob picks them up automatically, so tracks never collide here.
import type { ComponentType } from 'react'

export type DevRoute = {
  /** Hash path, e.g. "#/dev/scheduler". Must be unique. */
  path: string
  /** Menu label. */
  label: string
  /** Lower sorts first in the menu. */
  order: number
  Component: ComponentType
}

const modules = import.meta.glob<{ default: DevRoute }>('./*.route.tsx', { eager: true })

export const devRoutes: DevRoute[] = Object.values(modules)
  .map((m) => m.default)
  .filter((r): r is DevRoute => !!r && typeof r.path === 'string')
  .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
