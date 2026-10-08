type ModelSource = { readonly url: string; readonly atlasUrl: string }

export type AtlasWarmUp = {
  /** Resolves once every atlas these sources use is decoded and cached. The same atlases always get the same promise. */
  readonly ready: (sources: readonly ModelSource[]) => Promise<unknown>
  /** The GLB that warms `atlasUrl`: the first one any caller asked for with it. */
  readonly warmUpUrl: (atlasUrl: string) => string | undefined
}

/**
 * One warm-up per atlas for the whole app. three r185's ImageBitmapLoader
 * hands `undefined` to a second caller that asks for an image still in
 * flight, so exactly one GLB per atlas may load before the atlas is cached —
 * whichever component asks first, every other one waits for that same load.
 */
export function atlasWarmUp(load: (url: string) => Promise<unknown>): AtlasWarmUp {
  const byAtlas = new Map<string, { url: string; loaded: Promise<unknown> }>()
  const batches = new Map<string, Promise<unknown>>()

  const warm = ({ url, atlasUrl }: ModelSource): Promise<unknown> => {
    const claimed = byAtlas.get(atlasUrl)
    if (claimed) return claimed.loaded
    const loaded = load(url)
    byAtlas.set(atlasUrl, { url, loaded })
    // A failed warm-up is forgotten so a retry (the scene's error boundary) loads it again; the caller sees the error.
    loaded.catch(() => {
      byAtlas.delete(atlasUrl)
      for (const key of batches.keys()) if (key.split('\n').includes(atlasUrl)) batches.delete(key)
    })
    return loaded
  }

  return {
    ready(sources) {
      const firstPerAtlas = new Map<string, ModelSource>()
      for (const source of sources) if (!firstPerAtlas.has(source.atlasUrl)) firstPerAtlas.set(source.atlasUrl, source)
      const key = [...firstPerAtlas.keys()].sort().join('\n')
      const existing = batches.get(key)
      if (existing) return existing
      const batch = Promise.all([...firstPerAtlas.values()].map(warm))
      batches.set(key, batch)
      return batch
    },
    warmUpUrl: (atlasUrl) => byAtlas.get(atlasUrl)?.url,
  }
}
