import { Bone, BufferGeometry, Group, Skeleton, SkinnedMesh } from 'three'
import { describe, expect, it } from 'vitest'
import { SkeletonPose } from './skeleton-pose'

/** A torso and an arm, drawn by one skinned mesh; `loose` is a bone no mesh draws with. */
function rig(): { root: Group; arm: Bone; loose: Bone } {
  const root = new Group()
  const torso = new Bone()
  const arm = new Bone()
  const loose = new Bone()
  torso.add(arm)
  const mesh = new SkinnedMesh(new BufferGeometry())
  mesh.bind(new Skeleton([torso, arm]))
  root.add(torso, loose, mesh)
  return { root, arm, loose }
}

describe('SkeletonPose', () => {
  it('reads zero in the pose it was made in', () => {
    expect(new SkeletonPose(rig().root).offsetFromBind()).toBe(0)
  })

  it('reads the largest turn of any bone since then', () => {
    const { root, arm } = rig()
    const pose = new SkeletonPose(root)
    arm.rotation.z = -Math.PI / 4
    expect(pose.offsetFromBind()).toBeCloseTo(Math.PI / 4, 6)
  })

  it('ignores bones no skinned mesh draws with, as a clone sharing its original skeleton has', () => {
    const { root, loose } = rig()
    const pose = new SkeletonPose(root)
    loose.rotation.y = 1
    expect(pose.offsetFromBind()).toBe(0)
  })
})
