import { useThree } from '@react-three/fiber'
import { type TileCoord, type TileWorld, tileCentre } from '@sf/world'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

/** What the e2e suite (and a curious developer's console) can ask the open editor. */
export type WorldEditorProbe = {
  /** The page position of a tile's centre on the ground, in CSS pixels. */
  screenOf: (tile: TileCoord) => { x: number; y: number }
  /** The world as currently drawn. */
  world: () => TileWorld
}

declare global {
  interface Window {
    sfWorldEditor?: WorldEditorProbe
  }
}

/** Dev-only like the rest of the editor: it lives in the editor's chunk, which production never builds. */
export function EditorProbe({ world }: { world: TileWorld }) {
  const camera = useThree((state) => state.camera)
  const element = useThree((state) => state.gl.domElement)
  const current = useRef(world)
  useEffect(() => {
    current.current = world
  }, [world])

  useEffect(() => {
    window.sfWorldEditor = {
      screenOf: (tile) => {
        const [x, z] = tileCentre(tile)
        const projected = new Vector3(x, 0, z).project(camera)
        const box = element.getBoundingClientRect()
        return { x: box.left + ((projected.x + 1) / 2) * box.width, y: box.top + ((1 - projected.y) / 2) * box.height }
      },
      world: () => current.current,
    }
    return () => {
      delete window.sfWorldEditor
    }
  }, [camera, element])

  return null
}
