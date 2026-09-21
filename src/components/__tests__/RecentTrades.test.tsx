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
})
