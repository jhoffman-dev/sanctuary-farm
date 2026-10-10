import { describe, expect, it } from 'vitest'
import { amendStep, recordStep, redo, startHistory, undo } from './edit-history'

const same = (one: number, other: number) => one === other

describe('edit history', () => {
  it('undoes and redoes steps in order', () => {
    const history = recordStep(recordStep(startHistory(0), 1, same), 2, same)
    expect(undo(history).present).toBe(1)
    expect(undo(undo(history)).present).toBe(0)
    expect(redo(undo(undo(history))).present).toBe(1)
    expect(redo(redo(undo(undo(history)))).present).toBe(2)
  })

  it('does nothing past either end', () => {
    const history = startHistory(5)
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it('does not record a change that changes nothing', () => {
    const history = recordStep(startHistory(3), 3, same)
    expect(history.past).toEqual([])
  })

  it('drops the redo branch when a new step is recorded after an undo', () => {
    const history = recordStep(undo(recordStep(startHistory(0), 1, same)), 9, same)
    expect(history.future).toEqual([])
    expect(history.past).toEqual([0])
    expect(history.present).toBe(9)
  })

  it('amends the present without a new step, so a drag is one undo', () => {
    const stroke = amendStep(amendStep(recordStep(startHistory(0), 1, same), 2), 3)
    expect(stroke.present).toBe(3)
    expect(undo(stroke).present).toBe(0)
  })
})
