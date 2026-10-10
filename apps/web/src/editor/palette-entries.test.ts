import { PIECE_IDS } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { PALETTE, PALETTE_GROUPS } from './palette-entries'

describe('the palette', () => {
  it('lists every PieceId exactly once', () => {
    const listed = PALETTE.flatMap((entry) => entry.pieceIds)
    expect([...listed].sort()).toEqual([...PIECE_IDS].sort())
  })

  it('fills every group, in group order, with unique keys', () => {
    const groups = PALETTE.map((entry) => entry.group)
    expect([...new Set(groups)]).toEqual([...PALETTE_GROUPS])
    expect(new Set(PALETTE.map((entry) => entry.key)).size).toBe(PALETTE.length)
  })

  it('names pieces for people', () => {
    expect(PALETTE.find((entry) => entry.key === 'hay-bale')?.label).toBe('Hay bale')
    expect(PALETTE.find((entry) => entry.key === 'building-wall-door')?.label).toBe('Wall door')
    expect(PALETTE.find((entry) => entry.key === 'hotspot-feed-shed')?.tool).toEqual({ kind: 'move-hotspot', hotspot: 'feed-shed' })
  })
})
