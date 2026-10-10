import { describe, expect, it } from 'vitest'
import { splitByAtlas } from './split-by-atlas'

describe('splitByAtlas', () => {
  it('loads one model per atlas first, then the rest, each URL once', () => {
    const split = splitByAtlas([
      { url: 'a/cow.glb', atlasUrl: 'a.png' },
      { url: 'a/pig.glb', atlasUrl: 'a.png' },
      { url: 'b/tree.glb', atlasUrl: 'b.png' },
      { url: 'a/pig.glb', atlasUrl: 'a.png' },
      { url: 'b/rock.glb', atlasUrl: 'b.png' },
    ])
    expect(split).toEqual({ first: ['a/cow.glb', 'b/tree.glb'], rest: ['a/pig.glb', 'b/rock.glb'] })
  })

  it('handles an empty list', () => {
    expect(splitByAtlas([])).toEqual({ first: [], rest: [] })
  })
})
