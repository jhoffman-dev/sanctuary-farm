import { describe, expect, it } from 'vitest'
import { type KeyPress, SHORTCUTS, commandForKey } from './editor-keys'

function press(key: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...modifiers }
}

describe('commandForKey', () => {
  it('maps undo, redo and save with either ⌘ or Ctrl', () => {
    expect(commandForKey(press('z', { metaKey: true }))).toBe('undo')
    expect(commandForKey(press('z', { ctrlKey: true }))).toBe('undo')
    expect(commandForKey(press('Z', { metaKey: true, shiftKey: true }))).toBe('redo')
    expect(commandForKey(press('y', { ctrlKey: true }))).toBe('redo')
    expect(commandForKey(press('s', { metaKey: true }))).toBe('save')
  })

  it('maps the single-letter tools only without ⌘ or Ctrl', () => {
    expect(commandForKey(press('r'))).toBe('rotate')
    expect(commandForKey(press('R', { shiftKey: true }))).toBe('rotate')
    expect(commandForKey(press('e'))).toBe('erase-tool')
    expect(commandForKey(press('t'))).toBe('top-down')
    expect(commandForKey(press('r', { metaKey: true }))).toBeNull()
    expect(commandForKey(press('Escape'))).toBe('cancel')
    expect(commandForKey(press('q'))).toBeNull()
  })

  it('gives every command one legend line', () => {
    expect(new Set(SHORTCUTS.map((shortcut) => shortcut.command)).size).toBe(SHORTCUTS.length)
    for (const shortcut of SHORTCUTS) expect(shortcut.keys.length).toBeGreaterThan(0)
  })
})
