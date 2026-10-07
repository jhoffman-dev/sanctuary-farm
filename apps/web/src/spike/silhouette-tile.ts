/**
 * Art-direction §3's 64-px silhouette rule, turned into numbers. The browser
 * renders each model flat black on white and shrinks it to a 64 × 64 tile;
 * everything after the pixels exist lives here, pure, so it is unit-tested and
 * the Playwright spec can compare tiles without a GPU.
 */

/** A binary image: 1 where the silhouette is, 0 where the background is. */
export type Mask = { size: number; cells: Uint8Array }

export type PixelBox = { left: number; top: number; width: number; height: number }

/** Anything darker than mid-grey is silhouette; the anti-aliased edge splits at 50 %. */
export const INK_THRESHOLD = 128

function luminanceAt(rgba: Uint8ClampedArray, index: number): number {
  const [red = 0, green = 0, blue = 0] = rgba.subarray(index * 4, index * 4 + 3)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** The tight box around every inked pixel of a `width`-wide RGBA image, or null if blank. */
export function inkBounds({ rgba, width }: { rgba: Uint8ClampedArray; width: number }): PixelBox | null {
  const height = rgba.length / 4 / width
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (luminanceAt(rgba, y * width + x) >= INK_THRESHOLD) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/**
 * The square crop, centred on `box`, whose side is the box's longer edge — so
 * shrinking it to the tile keeps the model's proportions and makes its longer
 * dimension exactly fill the tile.
 */
export function squareAround(box: PixelBox): PixelBox {
  const side = Math.max(box.width, box.height)
  return {
    left: box.left + (box.width - side) / 2,
    top: box.top + (box.height - side) / 2,
    width: side,
    height: side,
  }
}

/** Binarise a square RGBA tile at {@link INK_THRESHOLD}. */
export function maskFromRgba(rgba: Uint8ClampedArray): Mask {
  const size = Math.sqrt(rgba.length / 4)
  if (!Number.isInteger(size)) throw new RangeError(`tile is not square: ${rgba.length / 4} pixels`)
  const cells = new Uint8Array(size * size)
  for (let index = 0; index < cells.length; index += 1) cells[index] = luminanceAt(rgba, index) < INK_THRESHOLD ? 1 : 0
  return { size, cells }
}

/** The fraction of the tile the silhouette covers. */
export function filledRatio(mask: Mask): number {
  let filled = 0
  for (const cell of mask.cells) filled += cell
  return filled / mask.cells.length
}

/**
 * Intersection over union of two same-size masks: 1 means the two silhouettes
 * are the same shape, 0 that they share no pixel. Two empty masks are
 * identical, so they score 1.
 */
export function intersectionOverUnion(a: Mask, b: Mask): number {
  if (a.size !== b.size) throw new RangeError(`mask sizes differ: ${a.size} vs ${b.size}`)
  let intersection = 0
  let union = 0
  for (let index = 0; index < a.cells.length; index += 1) {
    const inA = a.cells[index] ?? 0
    const inB = b.cells[index] ?? 0
    intersection += inA & inB
    union += inA | inB
  }
  return union === 0 ? 1 : intersection / union
}

/** Compact, JSON-safe form for carrying a mask out of the browser: one '0'/'1' per cell. */
export function maskToString(mask: Mask): string {
  return Array.from(mask.cells).join('')
}

export function maskFromString(encoded: string): Mask {
  const size = Math.sqrt(encoded.length)
  if (!Number.isInteger(size) || /[^01]/.test(encoded)) throw new RangeError('not an encoded square mask')
  return { size, cells: Uint8Array.from(encoded, (char) => (char === '1' ? 1 : 0)) }
}
