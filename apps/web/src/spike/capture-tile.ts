import { inkBounds, maskFromRgba, maskToString, squareAround } from './silhouette-tile'

/** Art-direction §3: the rendered size on the smallest supported device. */
export const TILE_PX = 64

export type CapturedTile = { pngDataUrl: string; mask: string }

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('spike: no 2D canvas context to read the silhouette with')
  return context
}

/**
 * Read a black-on-white WebGL render back, crop it to a square around the
 * silhouette and shrink that to a {@link TILE_PX} tile with the browser's own
 * high-quality filter — the same thing a GPU does when a model is drawn small.
 * Returns null when nothing has been drawn yet.
 *
 * The WebGL canvas must keep its drawing buffer (`preserveDrawingBuffer`), or
 * the copy reads back blank between frames.
 */
export function captureTile(source: HTMLCanvasElement): CapturedTile | null {
  const full = document.createElement('canvas')
  full.width = source.width
  full.height = source.height
  const fullContext = context2d(full)
  fullContext.drawImage(source, 0, 0)
  const rgba = fullContext.getImageData(0, 0, full.width, full.height).data
  const box = inkBounds({ rgba, width: full.width })
  if (!box) return null

  const crop = squareAround(box)
  const tile = document.createElement('canvas')
  tile.width = TILE_PX
  tile.height = TILE_PX
  const tileContext = context2d(tile)
  tileContext.fillStyle = '#ffffff'
  tileContext.fillRect(0, 0, TILE_PX, TILE_PX)
  tileContext.imageSmoothingEnabled = true
  tileContext.imageSmoothingQuality = 'high'
  tileContext.drawImage(full, crop.left, crop.top, crop.width, crop.height, 0, 0, TILE_PX, TILE_PX)

  const mask = maskFromRgba(tileContext.getImageData(0, 0, TILE_PX, TILE_PX).data)
  return { pngDataUrl: tile.toDataURL('image/png'), mask: maskToString(mask) }
}
