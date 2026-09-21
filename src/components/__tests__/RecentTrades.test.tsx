// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecentTrades } from '../RecentTrades'
import { useRecentTrades } from '../../hooks/useRecentTrades'
import type { TradePrint } from '../../data/trades'

vi.mock('../../hooks/useRecentTrades', () => ({ useRecentTrades: vi.fn(() => []) }))

const hook = vi.mocked(useRecentTrades)

afterEach(() => {
  cleanup()
  hook.mockReset().mockReturnValue([])
})

const print = (id: number, buy: boolean): TradePrint => ({
  id,
  price: 63000 + id,
  qty: 1.5,
  time: new Date(2026, 0, 2, 10, 30, id).getTime(),
  buy,
})

describe('RecentTrades 成交明细', () => {
  it('最新成交在顶部，按主动买/主动卖标记方向', () => {
    hook.mockReturnValue([print(1, true), print(2, false), print(3, true)])
    render(<RecentTrades symbol="BTCUSDT" />)

    const rows = screen.getAllByTestId('tape-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].getAttribute('data-side')).toBe('buy')
    expect(rows[1].getAttribute('data-side')).toBe('sell')
    expect(rows[0].textContent).toContain('10:30:03')
  })

  it('渲染上限 20 行，头部汇总主动买/卖笔数', () => {
    hook.mockReturnValue(Array.from({ length: 25 }, (_, i) => print(i + 1, i % 5 === 0)))
    render(<RecentTrades symbol="BTCUSDT" />)
    expect(screen.getAllByTestId('tape-row')).toHaveLength(20)
    expect(screen.getByTestId('tape-side-summary').textContent).toBe('5 · 20')
  })

  it('点击成交行上报该价格给主图标记线', () => {
    const onMarkPrice = vi.fn()
    hook.mockReturnValue([print(7, false)])
    render(<RecentTrades symbol="BTCUSDT" onMarkPrice={onMarkPrice} />)
    fireEvent.click(screen.getByTestId('tape-row'))
    expect(onMarkPrice).toHaveBeenCalledWith(63007)
  })

  it('无成交时展示骨架屏与占位汇总', () => {
    hook.mockReturnValue([])
    render(<RecentTrades symbol="BTCUSDT" />)
    expect(screen.getByTestId('tape-skeleton')).toBeDefined()
    expect(screen.queryAllByTestId('tape-row')).toHaveLength(0)
    expect(screen.queryByTestId('tape-side-summary')).toBeNull()
  })

  it('v0.5.x 方向筛选：只保留对应主动方向的成交', () => {
    const rows = [print(1, true), print(2, false), print(3, false)]
    hook.mockReturnValue(rows)
    render(<RecentTrades symbol="BTCUSDT" />)
    expect(screen.getAllByTestId('tape-row')).toHaveLength(3)

    fireEvent.click(screen.getByTestId('tape-filter-sell'))
    const sells = screen.getAllByTestId('tape-row')
    expect(sells).toHaveLength(2)
    expect(sells.every((r) => r.getAttribute('data-side') === 'sell')).toBe(true)

    fireEvent.click(screen.getByTestId('tape-filter-all'))
    expect(screen.getAllByTestId('tape-row')).toHaveLength(3)
  })

  it('v0.5.x 大单档循环：×5 只留鲸鱼成交 → ×10 无命中 → 关闭恢复全量', () => {
    const many = Array.from({ length: 9 }, (_, i) => print(i + 1, true))
    hook.mockReturnValue([...many, print(10, false)].map((t) => (t.id === 10 ? { ...t, qty: 100 } : t)))
    render(<RecentTrades symbol="BTCUSDT" />)
    const big = screen.getByTestId('tape-filter-big')
    expect(screen.getAllByTestId('tape-row')).toHaveLength(10)
    expect(big.textContent).toBe('大单')

    // 均值 ≈ 11.35（9 笔 1.5 + 1 笔 100），×5 → 阈值 ≈ 56.8，只有 qty 100 的那笔通过
    fireEvent.click(big)
    expect(big.textContent).toBe('大单 ×5')
    const whales = screen.getAllByTestId('tape-row')
    expect(whales).toHaveLength(1)
    expect(whales[0].getAttribute('data-side')).toBe('sell')

    // ×10 → 阈值 ≈ 113.5，无命中 → 空态提示
    fireEvent.click(big)
    expect(big.textContent).toBe('大单 ×10')
    expect(screen.queryAllByTestId('tape-row')).toHaveLength(0)
    expect(screen.getByTestId('tape-empty-filter')).toBeDefined()

    fireEvent.click(big)
    expect(big.textContent).toBe('大单')
    expect(screen.getAllByTestId('tape-row')).toHaveLength(10)
  })
})
