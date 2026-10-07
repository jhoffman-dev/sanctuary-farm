import { useState } from 'react'
import type { CapturedTile } from './capture-tile'
import { SilhouetteScene } from './SilhouetteScene'
import type { SilhouetteSubject } from './spike-cast'

/**
 * `?spike=3d&pack=…&silhouette=<name>&turn=…`: renders one model as a black
 * silhouette and publishes its 64-px tile onto the DOM for the Playwright spec.
 */
export function SilhouettePage({ subject, yaw }: { subject: SilhouetteSubject; yaw: number }) {
  const [tile, setTile] = useState<CapturedTile | null>(null)

  return (
    <main className="relative h-full w-full bg-white">
      <SilhouetteScene subject={subject} yaw={yaw} onCaptured={setTile} />
      {tile ? (
        <img
          src={tile.pngDataUrl}
          alt={`${subject.name} silhouette at 64 px`}
          data-testid="silhouette-tile"
          data-name={subject.name}
          data-mask={tile.mask}
          className="absolute right-2 bottom-2 border border-stone-300"
        />
      ) : null}
    </main>
  )
}
