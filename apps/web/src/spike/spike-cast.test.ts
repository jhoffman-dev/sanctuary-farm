import { describe, expect, it } from 'vitest'
import { SCREEN_TO_WORLD_YAW } from './camera-rig'
import { CASTS, silhouetteSubjects, silhouetteYaw, spikeRouteFrom, WORLD_HEIGHT } from './spike-cast'

describe('spikeRouteFrom', () => {
  it('keeps the original ?spike=3d meaning: the Quaternius scene', () => {
    expect(spikeRouteFrom('?spike=3d')).toEqual({ view: 'scene', pack: 'quaternius' })
  })

  it('selects the Kenney scene with pack=kenney', () => {
    expect(spikeRouteFrom('?spike=3d&pack=kenney')).toEqual({ view: 'scene', pack: 'kenney' })
  })

  it('isolates one model, case-insensitively, for the silhouette view', () => {
    const route = spikeRouteFrom('?spike=3d&pack=kenney&silhouette=Hog')
    expect(route).toEqual({
      view: 'silhouette',
      pack: 'kenney',
      model: { name: 'Hog', url: '/spike/kenney/animal-hog.glb', targetHeight: WORLD_HEIGHT.pig, restingClip: 'idle' },
      yaw: silhouetteYaw('three-quarter'),
    })
  })

  it('can isolate the keeper, using its idle clip', () => {
    const route = spikeRouteFrom('?spike=3d&pack=quaternius&silhouette=keeper')
    expect(route.view === 'silhouette' && route.model.restingClip).toBe('Idle')
  })

  it('throws on a model the pack does not have, rather than measuring nothing', () => {
    expect(() => spikeRouteFrom('?spike=3d&pack=kenney&silhouette=horse')).toThrow(/no "horse" in the kenney pack/)
  })
})

describe('silhouette turn', () => {
  it('defaults to three-quarter and accepts head-on and profile', () => {
    const yawFor = (turn: string) => {
      const route = spikeRouteFrom(`?spike=3d&pack=kenney&silhouette=cow${turn}`)
      return route.view === 'silhouette' ? route.yaw : Number.NaN
    }
    expect(yawFor('&turn=headon')).toBeCloseTo(SCREEN_TO_WORLD_YAW, 12)
    expect(yawFor('')).toBeCloseTo(SCREEN_TO_WORLD_YAW + Math.PI / 4, 12)
    expect(yawFor('&turn=profile')).toBeCloseTo(SCREEN_TO_WORLD_YAW + Math.PI / 2, 12)
  })

  it('throws on an unknown turn', () => {
    expect(() => spikeRouteFrom('?spike=3d&silhouette=cow&turn=sideways')).toThrow(/unknown silhouette turn/)
  })
})

describe('casts', () => {
  it('puts every Kenney model under /spike/kenney/ with lower-case §8 clip names', () => {
    const kenney = CASTS.kenney
    expect(kenney.keeper.clips).toEqual({ Idle: 'idle', Walk: 'walk' })
    for (const grazer of kenney.grazers) {
      expect(grazer.url.startsWith('/spike/kenney/')).toBe(true)
      expect(grazer.clips).toEqual({ resting: 'idle', busy: 'eat' })
    }
  })

  it('offers every grazer plus the keeper as a silhouette subject', () => {
    expect([...silhouetteSubjects('kenney').keys()]).toEqual(['cow', 'hog', 'pig', 'chick', 'keeper'])
  })
})
