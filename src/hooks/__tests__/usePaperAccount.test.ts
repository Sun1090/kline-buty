// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaperAccount } from '../usePaperAccount'

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('usePaperAccount（模拟交易账户）', () => {
  it('初始余额 10,000；canOpen 按名义金额+手续费判断', () => {
    const { result } = renderHook(() => usePaperAccount())
    expect(result.current.balance).toBe(10_000)
    expect(result.current.canOpen(9_990, 10)).toBe(true)
    expect(result.current.canOpen(10_000, 1)).toBe(false)
  })

  it('recordOpen 扣手续费并写流水', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 10, fee: 1 }))
    expect(result.current.balance).toBe(9_999)
    expect(result.current.trades).toHaveLength(1)
    expect(result.current.trades[0]).toMatchObject({ symbol: 'BTCUSDT', side: 'buy', kind: 'open', fee: 1 })
  })

  it('recordClose 结算盈亏−平仓手续费，流水带净 pnl', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => {
      result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 10, fee: 1 })
      result.current.recordClose({ symbol: 'BTCUSDT', side: 'buy', price: 110, qty: 10, fee: 1.1, pnl: 100 })
    })
    // 10,000 − 1（开仓费）+ 100（价差）− 1.1（平仓费）
    expect(result.current.balance).toBeCloseTo(10_097.9, 8)
    expect(result.current.trades[0]).toMatchObject({ kind: 'close', pnl: 98.9 })
    expect(result.current.trades[1].kind).toBe('open')
  })

  it('流水持久化 + clearTrades 清空（余额不动）', () => {
    const { result, rerender } = renderHook(() => usePaperAccount())
    act(() => result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 1, fee: 0.1 }))
    rerender()
    expect(JSON.parse(localStorage.getItem('kline-buty:paperTrades')!)).toHaveLength(1)
    act(() => result.current.clearTrades())
    expect(result.current.trades).toHaveLength(0)
    expect(result.current.balance).toBe(9_999.9)
  })

  it('流水上限 TRADES_MAX=100 裁剪最旧', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => {
      for (let i = 0; i < 105; i++) {
        result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 0.0001, fee: 0 })
      }
    })
    expect(result.current.trades).toHaveLength(100)
  })

  it('reset 恢复初始资金 10,000 并清空流水（余额与流水均复位）', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => {
      result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 1, fee: 0.1 })
      result.current.recordClose({ symbol: 'BTCUSDT', side: 'sell', price: 110, qty: 1, fee: 0.11, pnl: 10 })
    })
    expect(result.current.trades).toHaveLength(2)
    expect(result.current.balance).not.toBe(10_000)
    act(() => result.current.reset())
    expect(result.current.balance).toBe(10_000)
    expect(result.current.trades).toHaveLength(0)
    // reset 会 removeItem：localStorage 中流水键应被移除
    expect(localStorage.getItem('kline-buty:paperTrades')).toBeNull()
  })
})
