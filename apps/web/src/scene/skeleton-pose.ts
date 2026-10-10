import type { Bone, Object3D, Quaternion, SkinnedMesh } from 'three'

/**
 * How far a skinned model's bones have turned from the pose they were cloned
 * in (the bind pose): the largest angle any one bone is off it, in radians.
 * Zero means no clip is reaching the skeleton, so a test can tell a playing
 * clip from a model frozen in its T-pose without reading pixels. It reads the
 * bones the skinned meshes draw with, not every bone in the tree: a clone
 * that left its meshes on the original's skeleton must read zero.
 */
export class SkeletonPose {
  readonly #bones: readonly { readonly bone: Bone; readonly bind: Quaternion }[]

  constructor(root: Object3D) {
    const bones = new Set<Bone>()
    root.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh) for (const bone of (node as SkinnedMesh).skeleton.bones) bones.add(bone)
    })
    this.#bones = [...bones].map((bone) => ({ bone, bind: bone.quaternion.clone() }))
  }

  offsetFromBind(): number {
    return this.#bones.reduce((largest, { bone, bind }) => Math.max(largest, bone.quaternion.angleTo(bind)), 0)
  }
}
