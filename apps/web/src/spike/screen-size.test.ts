import { describe, expect, it } from 'vitest'
import { ndcHeightToPixels } from './screen-size'

describe('ndcHeightToPixels', () => {
  it('maps the whole NDC range onto the whole viewport', () => {
    expect(ndcHeightToPixels(2, 800)).toBe(800)
  })

  it('maps a fraction of the range proportionally', () => {
    expect(ndcHeightToPixels(0.5, 640)).toBe(160)
  })

  it('is zero for a degenerate box', () => {
    expect(ndcHeightToPixels(0, 800)).toBe(0)
  })
})
