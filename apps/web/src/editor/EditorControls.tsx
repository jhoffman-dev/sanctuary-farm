import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MOUSE } from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import type { CameraView } from '../scene/camera-views'

/** A camera jump: the view to show, and a counter so asking for the same view twice still jumps. */
export type CameraCommand = { readonly view: CameraView; readonly id: number }

type EditorControlsProps = {
  command: CameraCommand
  /** When the tool owns left-drag (painting, dragging a hotspot) the camera must not pan with it. */
  leftDragPans: boolean
}

/** Just short of the horizon, so the camera never dips under the ground. */
const LOWEST_TILT = Math.PI / 2 - 0.05

function buttons(leftDragPans: boolean): MapControls['mouseButtons'] {
  return { LEFT: leftDragPans ? MOUSE.PAN : null, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }
}

/**
 * Orbit / pan / zoom, Unity-style: right-drag orbits, middle-drag and the
 * arrow keys pan, the wheel zooms. Left-drag pans only while the Select tool
 * leaves it free.
 */
export function EditorControls({ command, leftDragPans }: EditorControlsProps) {
  const camera = useThree((state) => state.camera)
  const element = useThree((state) => state.gl.domElement)
  const controls = useRef<MapControls | null>(null)

  useEffect(() => {
    const created = new MapControls(camera, element)
    created.listenToKeyEvents(window)
    created.maxPolarAngle = LOWEST_TILT
    controls.current = created
    return () => {
      created.dispose()
      controls.current = null
    }
  }, [camera, element])

  useEffect(() => {
    if (controls.current) controls.current.mouseButtons = buttons(leftDragPans)
  }, [leftDragPans])

  useEffect(() => {
    camera.position.set(...command.view.position)
    controls.current?.target.set(...command.view.lookAt)
    controls.current?.update()
  }, [camera, command])

  useFrame(() => controls.current?.update())
  return null
}
