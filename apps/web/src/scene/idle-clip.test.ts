import { describe, expect, it } from 'vitest'
import { findClipNamed, findIdleClip } from './idle-clip'

const clips = (...names: string[]) => names.map((name) => ({ name }))

describe('findIdleClip', () => {
  it.each(['idle', 'Idle', 'CharacterArmature|Idle'])('finds the idle clip named %s', (name) => {
    expect(findIdleClip(clips('walk', name, 'eat'))?.name).toBe(name)
  })

  it('does not mistake a clip that merely contains the word for idle', () => {
    expect(findIdleClip(clips('idle-to-walk', 'sidle', 'walk'))).toBeUndefined()
  })

  it('finds nothing in a model without clips', () => {
    expect(findIdleClip([])).toBeUndefined()
  })
})

describe('findClipNamed', () => {
  it.each(['walk', 'Walk', 'CharacterArmature|Walk'])('finds the walk clip named %s', (name) => {
    expect(findClipNamed(clips('idle', name, 'sprint'), 'walk')?.name).toBe(name)
  })

  it('does not take a walk-like clip for the walk', () => {
    expect(findClipNamed(clips('wheelchair-move-forward', 'walk-back'), 'walk')).toBeUndefined()
  })
})
