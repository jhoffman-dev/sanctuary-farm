import { useEffect } from 'react'
import { type EditorCommand, commandForKey } from './editor-keys'

/** Typing a seed must not switch tools. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/** Routes the shortcut table's commands to the editor while it is open. */
export function useEditorKeys(run: (command: EditorCommand) => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const command = commandForKey(event)
      if (!command) return
      // ⌘S would otherwise open the browser's "save page" dialog, and ⌘Z its own undo.
      event.preventDefault()
      run(command)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run])
}
