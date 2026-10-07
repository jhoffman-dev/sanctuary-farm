import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { Box3, MeshBasicMaterial, Vector3, type Group, type PerspectiveCamera } from 'three'
import { CAMERA_FOV, CAMERA_LOOK_AT, CAMERA_POSITION } from './camera-rig'
import { captureTile, type CapturedTile } from './capture-tile'
import type { SilhouetteSubject } from './spike-cast'
import { useAnimatedGltf } from './use-animated-gltf'

/**
 * The §2 camera's line of sight, kept exactly; only the field of view narrows
 * so the one model fills the render instead of a sliver of it.
 */
const VIEW_OFFSET = new Vector3(...CAMERA_POSITION).sub(new Vector3(...CAMERA_LOOK_AT))
/** Room around the model so no pose pokes outside the frame. */
const FRAMING_MARGIN = 1.6
/** Frames to let the mixer pose the model and the renderer settle before reading pixels. */
const SETTLE_FRAMES = 4

const INK = new MeshBasicMaterial({ color: '#000000' })

/** Aim the §2 camera's direction at the model and narrow the FOV to frame it. */
function frameSubject(camera: PerspectiveCamera, subject: Group): void {
  const box = new Box3().setFromObject(subject)
  const centre = box.getCenter(new Vector3())
  const radius = box.getSize(new Vector3()).length() / 2
  const distance = VIEW_OFFSET.length()
  camera.position.copy(centre).add(VIEW_OFFSET)
  camera.lookAt(centre)
  camera.fov = (2 * Math.atan((radius * FRAMING_MARGIN) / distance) * 180) / Math.PI
  camera.updateProjectionMatrix()
}

type SubjectProps = { subject: SilhouetteSubject; yaw: number; onCaptured: (tile: CapturedTile) => void }

function SilhouetteSubjectModel({ subject, yaw, onCaptured }: SubjectProps) {
  const { scene: model, mixer, actions, scale, offsetY } = useAnimatedGltf(subject)
  const group = useRef<Group>(null)
  const camera = useThree((state) => state.camera as PerspectiveCamera)
  const canvas = useThree((state) => state.gl.domElement)
  const frames = useRef(0)

  useEffect(() => {
    const idle = actions.get(subject.restingClip)
    if (!idle) throw new Error(`spike: clip "${subject.restingClip}" is not in ${subject.url}`)
    idle.reset().play()
    mixer.update(0)
    return () => {
      mixer.stopAllAction()
    }
  }, [actions, mixer, subject])

  useFrame(() => {
    frames.current += 1
    if (frames.current === 1 && group.current) frameSubject(camera, group.current)
    if (frames.current !== SETTLE_FRAMES) return
    const tile = captureTile(canvas)
    if (!tile) throw new Error(`spike: ${subject.name} rendered no silhouette`)
    onCaptured(tile)
  })

  return (
    <group ref={group} rotation={[0, yaw, 0]}>
      <primitive object={model} position={[0, offsetY, 0]} scale={scale} />
    </group>
  )
}

/**
 * One model, flat black on white, seen down the art-direction §2 camera's line
 * of sight at its §2 world size, posed at frame 0 of its idle clip.
 */
export function SilhouetteScene(props: SubjectProps) {
  return (
    <Canvas
      dpr={1}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: CAMERA_FOV }}
      style={{ position: 'absolute', inset: 0 }}
      data-testid="silhouette-canvas"
      // Black for every mesh, skinned or rigid: the silhouette is shape alone.
      onCreated={({ scene }) => {
        scene.overrideMaterial = INK
      }}
    >
      <color attach="background" args={['#ffffff']} />
      <Suspense fallback={null}>
        <SilhouetteSubjectModel {...props} />
      </Suspense>
    </Canvas>
  )
}
