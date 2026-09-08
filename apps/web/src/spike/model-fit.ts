/**
 * Quaternius glTFs are not authored at 1 unit = 1 m (art-direction §8), so the
 * spike normalises them on load instead of hand-tuning a scale per model. The
 * maths lives here so it can be tested without a GPU.
 */

export type ModelBounds = { minY: number; maxY: number }

export type ModelFit = { scale: number; offsetY: number }

/**
 * The uniform scale that makes a model `targetHeight` tall, plus the Y offset
 * that puts its lowest point on the ground plane.
 */
export function fitToHeight({ bounds, targetHeight }: { bounds: ModelBounds; targetHeight: number }): ModelFit {
  const height = bounds.maxY - bounds.minY
  if (!(height > 0)) throw new RangeError(`model has no height: ${JSON.stringify(bounds)}`)
  const scale = targetHeight / height
  return { scale, offsetY: -bounds.minY * scale }
}
