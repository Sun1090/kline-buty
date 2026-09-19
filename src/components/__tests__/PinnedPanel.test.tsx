// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PinnedPanel } from '../PinnedPanel'
import { useMarketSnapshots, type MarketSnapshot } from '../../hooks/useMarketSnapshots'

vi.mock('../../hooks/useMarketSnapshots', () => ({
  useMarketSnapshots: vi.fn(() => ({ snapshots: {}, loading: false })),
}))

const mockSnapshots = vi.mocked(useMarketSnapshots)

let snapStore: Record<string, MarketSnapshot> = {}
beforeEach(() => {
  snapStore = {}
  mockSnapshots.mockReturnValue({ snapshots: snapStore, loading: false })
})

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

  it('v0.5.x 24h 涨跌幅显示：有快照时显示 +N%/-N%（正负着色由色值体现）', () => {
    snapStore.BTCUSDT = { symbol: 'BTCUSDT', price: 63000, changePct: 1.23, spark: [1, 2, 3] }
    snapStore.ETHUSDT = { symbol: 'ETHUSDT', price: 3200, changePct: -0.45, spark: [1, 2, 3] }
    render(<PinnedPanel symbols={['BTCUSDT', 'ETHUSDT']} onSelect={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('pinned-change-BTCUSDT').textContent).toBe('+1.23%')
    expect(screen.getByTestId('pinned-change-ETHUSDT').textContent).toBe('-0.45%')
  })

  it('v0.5.x 当前品种高亮：activeSymbol 对应行 data-active + 左框 accent', () => {
    render(<PinnedPanel symbols={['BTCUSDT', 'ETHUSDT']} activeSymbol="ETHUSDT" onSelect={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    const active = screen.getByTestId('pinned-row-ETHUSDT')
    const inactive = screen.getByTestId('pinned-row-BTCUSDT')
    expect(active.getAttribute('data-active')).toBe('true')
    expect(inactive.getAttribute('data-active')).toBeNull()
  })

  it('v0.5.x 排序：默认按价格降序（高价在前），切「涨跌」按涨幅降序', () => {
    // 价格：BTC(63000) > ETH(3200)；涨跌：ETH(+5%) > BTC(+1%)
    snapStore.BTCUSDT = { symbol: 'BTCUSDT', price: 63000, changePct: 1, spark: [1] }
    snapStore.ETHUSDT = { symbol: 'ETHUSDT', price: 3200, changePct: 5, spark: [1] }
    render(<PinnedPanel symbols={['BTCUSDT', 'ETHUSDT']} onSelect={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    const rows = () => screen.getAllByTestId(/^pinned-row-/).map((el) => el.getAttribute('data-testid'))
    // 默认价格降序：BTC 在前
    expect(rows()).toEqual(['pinned-row-BTCUSDT', 'pinned-row-ETHUSDT'])
    fireEvent.click(screen.getByTestId('pinned-sort-change'))
    // 涨跌降序：ETH(+5%) 在前
    expect(rows()).toEqual(['pinned-row-ETHUSDT', 'pinned-row-BTCUSDT'])
    // 切回价格
    fireEvent.click(screen.getByTestId('pinned-sort-price'))
    expect(rows()).toEqual(['pinned-row-BTCUSDT', 'pinned-row-ETHUSDT'])
  })
})