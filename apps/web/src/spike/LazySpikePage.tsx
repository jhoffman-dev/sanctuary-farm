import { lazy } from 'react'

/**
 * SF-63's throwaway 3D spike, split out of the shell chunk. Only `?spike=3d`
 * ever resolves it; this whole branch is not meant to merge.
 */
export const LazySpikePage = lazy(async () => ({ default: (await import('./SpikePage')).SpikePage }))
