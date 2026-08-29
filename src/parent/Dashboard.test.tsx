import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from './Dashboard'
import { buildDemoSave } from './__fixtures__/demoSave'
import { emptySave } from '@/save/store'

const noop = () => {}

describe('Dashboard', () => {
  it('renders all four sections against a fixture with no NaN in the DOM', () => {
    const save = buildDemoSave()
    expect(save.sessions.length).toBeGreaterThanOrEqual(3)

    const { container } = render(
      <Dashboard save={save} onExport={noop} onReset={noop} onClose={noop} />,
    )

    expect(screen.getByText(/heatmap/i)).toBeInTheDocument()
    expect(screen.getByText(/slowest facts/i)).toBeInTheDocument()
    expect(screen.getByText(/per day/i)).toBeInTheDocument()
    expect(screen.getByText(/accuracy trend/i)).toBeInTheDocument()

    expect(container.textContent ?? '').not.toMatch(/NaN/)
    expect(container.innerHTML).not.toMatch(/NaN/)
  })

  it('renders the full 12×12 heatmap grid', () => {
    render(<Dashboard save={buildDemoSave()} onExport={noop} onReset={noop} onClose={noop} />)
    // 144 cells, each titled "a×b — ..."
    const cells = screen.getAllByTitle(/^\d+×\d+ —/)
    expect(cells).toHaveLength(144)
  })

  it('shows at most ten slowest facts', () => {
    render(<Dashboard save={buildDemoSave()} onExport={noop} onReset={noop} onClose={noop} />)
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem').length).toBeLessThanOrEqual(10)
  })

  it('export button calls onExport', async () => {
    const onExport = vi.fn()
    render(<Dashboard save={buildDemoSave()} onExport={onExport} onReset={noop} onClose={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('reset asks for confirmation first', async () => {
    const onReset = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Dashboard save={buildDemoSave()} onExport={noop} onReset={onReset} onClose={noop} />)

    await userEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(onReset).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalledOnce()
    confirmSpy.mockRestore()
  })

  it('renders an empty save without crashing or NaN', () => {
    const { container } = render(
      <Dashboard save={emptySave()} onExport={noop} onReset={noop} onClose={noop} />,
    )
    expect(screen.getByText(/no introduced facts/i)).toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/NaN/)
  })
})
