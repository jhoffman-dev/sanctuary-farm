/** The editor's keyboard shortcuts: one table drives both the handler and the legend James reads. */
export type EditorCommand =
  | 'undo'
  | 'redo'
  | 'save'
  | 'rotate'
  | 'select-tool'
  | 'erase-tool'
  | 'move-hotspot-tool'
  | 'add-land-tool'
  | 'game-camera'
  | 'top-down'
  | 'cancel'

export type KeyPress = {
  readonly key: string
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
}

type Shortcut = {
  readonly command: EditorCommand
  /** As shown in the legend. */
  readonly keys: string
  readonly does: string
  readonly matches: (press: KeyPress) => boolean
}

const commandKey = (press: KeyPress) => press.metaKey || press.ctrlKey
const plain = (letter: string) => (press: KeyPress) =>
  press.key.toLowerCase() === letter && !commandKey(press) && !press.altKey

export const SHORTCUTS: readonly Shortcut[] = [
  { command: 'select-tool', keys: 'V', does: 'Select a tile; left-drag pans', matches: plain('v') },
  { command: 'erase-tool', keys: 'E', does: 'Erase', matches: plain('e') },
  { command: 'move-hotspot-tool', keys: 'M', does: 'Move a hotspot: drag it', matches: plain('m') },
  { command: 'add-land-tool', keys: 'L', does: 'Add land beside the farm', matches: plain('l') },
  { command: 'rotate', keys: 'R', does: 'Rotate a quarter turn', matches: plain('r') },
  { command: 'game-camera', keys: 'G', does: 'Back to the game camera', matches: plain('g') },
  { command: 'top-down', keys: 'T', does: 'Top-down view on / off', matches: plain('t') },
  {
    command: 'undo',
    keys: '⌘/Ctrl Z',
    does: 'Undo',
    matches: (press) => commandKey(press) && !press.shiftKey && press.key.toLowerCase() === 'z',
  },
  {
    command: 'redo',
    keys: '⇧ ⌘/Ctrl Z',
    does: 'Redo',
    matches: (press) =>
      commandKey(press) && ((press.shiftKey && press.key.toLowerCase() === 'z') || press.key.toLowerCase() === 'y'),
  },
  { command: 'save', keys: '⌘/Ctrl S', does: 'Save to the repo', matches: (press) => commandKey(press) && press.key.toLowerCase() === 's' },
  { command: 'cancel', keys: 'Esc', does: 'Select tool, clear selection', matches: (press) => press.key === 'Escape' },
]

/** Mouse and trackpad moves for the legend; the camera library handles these itself. */
export const CAMERA_MOVES: readonly { readonly keys: string; readonly does: string }[] = [
  { keys: 'Right-drag', does: 'Orbit (Ctrl-drag on a trackpad)' },
  { keys: 'Middle-drag', does: 'Pan (or the arrow keys)' },
  { keys: 'Wheel', does: 'Zoom (or pinch)' },
]

export function commandForKey(press: KeyPress): EditorCommand | null {
  return SHORTCUTS.find((shortcut) => shortcut.matches(press))?.command ?? null
}
