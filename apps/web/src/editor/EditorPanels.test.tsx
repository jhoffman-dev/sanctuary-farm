import { NO_OVERRIDES } from '@sf/world'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolbar } from './EditorToolbar'
import { initialEditorState } from './editor-state'
import { Inspector } from './Inspector'
import { Palette } from './Palette'
import { ShortcutLegend } from './ShortcutLegend'
import { testSession } from './test-fixtures'
import { WorldPanel } from './WorldPanel'

const session = testSession()
const { world } = initialEditorState(session)
const barn = world.hotspots.find((hotspot) => hotspot.id === 'barn')!

describe('Palette', () => {
  it('picks the tool of the entry James clicks and marks it chosen, with its note spelled out', async () => {
    const onChoose = vi.fn()
    const { rerender } = render(<Palette tool={{ kind: 'select' }} onChoose={onChoose} />)
    await userEvent.setup().click(screen.getByTestId('palette-fence'))
    expect(onChoose).toHaveBeenCalledWith({ kind: 'place-structure', structure: 'fence' })
    rerender(<Palette tool={{ kind: 'place-structure', structure: 'fence' }} onChoose={onChoose} />)
    expect(screen.getByTestId('palette-fence')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Joins up by itself/)).toBeVisible()
  })
})

describe('Inspector', () => {
  it('asks for a selection until there is one', () => {
    render(<Inspector world={world} overrides={NO_OVERRIDES} selected={null} onRevert={vi.fn()} />)
    expect(screen.getByTestId('inspector')).toHaveTextContent('Select a tile')
  })

  it('shows a tile layer by layer, and reverts only when something is overridden', async () => {
    const at = { x: barn.footprint.x, z: barn.footprint.z }
    const onRevert = vi.fn()
    const overrides = { ...NO_OVERRIDES, edits: [{ op: 'remove-structure', at } as const] }
    const { rerender } = render(<Inspector world={world} overrides={NO_OVERRIDES} selected={at} onRevert={onRevert} />)
    expect(screen.getByTestId('inspector-hotspot')).toHaveTextContent('barn')
    expect(screen.getByRole('button', { name: 'Revert tile to generated' })).toBeDisabled()
    rerender(<Inspector world={world} overrides={overrides} selected={at} onRevert={onRevert} />)
    expect(screen.getByTestId('inspector-structure-source')).toHaveTextContent('overridden')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Revert tile to generated' }))
    expect(onRevert).toHaveBeenCalledWith(at)
  })

  it('says when the selection is off the land', () => {
    render(<Inspector world={world} overrides={NO_OVERRIDES} selected={{ x: 900, z: 0 }} onRevert={vi.fn()} />)
    expect(screen.getByTestId('inspector')).toHaveTextContent('off the land')
  })
})

describe('EditorToolbar', () => {
  const handlers = () => ({
    onTool: vi.fn(),
    onRotate: vi.fn(),
    onGameCamera: vi.fn(),
    onTopDown: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSave: vi.fn(),
  })

  it('counts unsaved changes, saves, and says why a save failed', async () => {
    const on = handlers()
    render(
      <EditorToolbar
        tool={{ kind: 'erase' }}
        rotation={3}
        topDown
        canUndo
        canRedo={false}
        unsaved={2}
        status={{ kind: 'failed', reason: 'overrides.json was not saved — x' }}
        {...on}
      />,
    )
    expect(screen.getByTestId('unsaved-count')).toHaveTextContent('2 unsaved changes')
    expect(screen.getByTestId('tool-erase')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('top-down')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('rotate')).toHaveTextContent('270°')
    expect(screen.getByTestId('redo')).toBeDisabled()
    expect(screen.getByTestId('save-status')).toHaveTextContent('Not saved: overrides.json was not saved — x')
    const user = userEvent.setup()
    await user.click(screen.getByTestId('save'))
    await user.click(screen.getByTestId('undo'))
    await user.click(screen.getByTestId('tool-add-land'))
    expect(on.onSave).toHaveBeenCalledOnce()
    expect(on.onUndo).toHaveBeenCalledOnce()
    expect(on.onTool).toHaveBeenCalledWith({ kind: 'add-land' })
  })

  it('says when there is nothing to save and stops a second save while one is running', () => {
    render(
      <EditorToolbar tool={{ kind: 'select' }} rotation={0} topDown={false} canUndo={false} canRedo={false} unsaved={0} status={{ kind: 'saving' }} {...handlers()} />,
    )
    expect(screen.getByTestId('unsaved-count')).toHaveTextContent('No unsaved changes')
    expect(screen.getByTestId('save')).toBeDisabled()
  })
})

describe('WorldPanel', () => {
  function renderPanel(seed = 5) {
    const on = { onSeed: vi.fn(), onRandomSeed: vi.fn(), onCopyOverrides: vi.fn(), onCopyWorld: vi.fn() }
    render(<WorldPanel seed={seed} chunkCount={4} {...on} />)
    return { on, user: userEvent.setup() }
  }

  it('applies a typed seed, and puts back one that is not a seed', async () => {
    const { on, user } = renderPanel()
    const input = screen.getByTestId('seed-input')
    await user.clear(input)
    await user.type(input, '123{Enter}')
    expect(on.onSeed).toHaveBeenCalledWith(123)
    await user.clear(input)
    await user.type(input, 'abc{Enter}')
    expect(input).toHaveValue('5')
    expect(on.onSeed).toHaveBeenCalledTimes(1)
  })

  it('asks for a random seed and offers both files to copy', async () => {
    const { on, user } = renderPanel()
    await user.click(screen.getByTestId('random-seed'))
    await user.click(screen.getByTestId('copy-overrides'))
    await user.click(screen.getByTestId('copy-world'))
    expect(on.onRandomSeed).toHaveBeenCalledOnce()
    expect(on.onCopyOverrides).toHaveBeenCalledOnce()
    expect(on.onCopyWorld).toHaveBeenCalledOnce()
  })
})

describe('ShortcutLegend', () => {
  it('lists the keys James needs', () => {
    render(<ShortcutLegend />)
    for (const text of ['Undo', 'Redo', 'Save to the repo', 'Rotate a quarter turn', 'Orbit (Ctrl-drag on a trackpad)']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })
})
