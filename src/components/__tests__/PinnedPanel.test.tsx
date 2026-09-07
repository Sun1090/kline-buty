// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PinnedPanel } from '../PinnedPanel'

afterEach(cleanup)

describe('PinnedPanel（I4 自选实时行情）', () => {
  it('空列表 → 空态提示；有关闭按钮', () => {
    const onClose = vi.fn()
    render(<PinnedPanel symbols={[]} onSelect={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onClose={onClose} />)
    expect(screen.getByTestId('pinned-panel')).toBeTruthy()
    expect(screen.getByTestId('pinned-close')).toBeTruthy()
    fireEvent.click(screen.getByTestId('pinned-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('列表渲染钉选品种 + 取消钉选触发回调', () => {
    const onSelect = vi.fn()
    const onAdd = vi.fn()
    const onRemove = vi.fn()
    render(<PinnedPanel symbols={['BTCUSDT', 'ETHUSDT']} onSelect={onSelect} onAdd={onAdd} onRemove={onRemove} onClose={vi.fn()} />)
    expect(screen.getByTestId('pinned-row-BTCUSDT')).toBeTruthy()
    expect(screen.getByTestId('pinned-row-ETHUSDT')).toBeTruthy()
    fireEvent.click(screen.getByTestId('pinned-remove-BTCUSDT'))
    expect(onRemove).toHaveBeenCalledWith('BTCUSDT')
    fireEvent.click(screen.getByText('BTC/USDT'))
    expect(onSelect).toHaveBeenCalledWith('BTCUSDT')
  })

  it('新增输入：键入品种 → 钉选按钮触发 onAdd', () => {
    const onAdd = vi.fn()
    render(<PinnedPanel symbols={[]} onSelect={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('pinned-add-input'), { target: { value: 'SOLUSDT' } })
    fireEvent.click(screen.getByTestId('pinned-add-btn'))
    expect(onAdd).toHaveBeenCalledWith('SOLUSDT')
  })
})