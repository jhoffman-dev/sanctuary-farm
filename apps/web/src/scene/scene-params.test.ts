import { describe, expect, it } from 'vitest'
import { sceneParams } from './scene-params'

describe('sceneParams', () => {
  it('is the plain game with no parameters', () => {
    expect(sceneParams('', true)).toEqual({ perf: false, view: null, quality: null })
  })

  it('turns the perf probe on only for ?perf=1, in any build', () => {
    expect(sceneParams('?perf=1', false).perf).toBe(true)
    expect(sceneParams('?perf=0', false).perf).toBe(false)
    expect(sceneParams('?perf', true).perf).toBe(false)
  })

  it('honours a known ?view= in a dev build', () => {
    expect(sceneParams('?view=overview', true).view).toBe('overview')
    expect(sceneParams('?view=paddock-corner&perf=1', true)).toEqual({ perf: true, view: 'paddock-corner', quality: null })
  })

  it('ignores ?view= in a production build, so a child never gets a debug camera', () => {
    expect(sceneParams('?view=overview', false).view).toBeNull()
  })

  it('ignores a view it does not know', () => {
    expect(sceneParams('?view=sideways', true).view).toBeNull()
  })

  it('forces a quality tier with ?quality=low|high in any build, and ignores anything else', () => {
    expect(sceneParams('?quality=low', false).quality).toBe('low')
    expect(sceneParams('?quality=high&perf=1', false).quality).toBe('high')
    expect(sceneParams('?quality=ultra', true).quality).toBeNull()
  })
})
