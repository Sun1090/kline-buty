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

  it('recordOpen/recordClose 记录 feeRate（D10 手续费拆分数据源）', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => {
      result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 10, fee: 1, feeRate: 0.001 })
      result.current.recordClose({ symbol: 'BTCUSDT', side: 'buy', price: 110, qty: 10, fee: 1.1, feeRate: 0.001, pnl: 100 })
    })
    expect(result.current.trades[0]).toMatchObject({ kind: 'close', feeRate: 0.001 })
    expect(result.current.trades[1]).toMatchObject({ kind: 'open', feeRate: 0.001 })
  })

  it('D13 保存/载入/删除快照：恢复余额与流水；重名拒绝', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => {
      result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 10, fee: 1 })
    })
    expect(result.current.balance).toBe(9_999)
    act(() => {
      expect(result.current.saveSnapshot('盈利回撤')).toBe(true)
      expect(result.current.saveSnapshot('盈利回撤')).toBe(false) // 重名
      expect(result.current.saveSnapshot('  ')).toBe(false) // 空名
    })
    expect(result.current.snapshots).toEqual(['盈利回撤'])
    // 继续交易后再载入 → 恢复快照时点的余额与流水
    act(() => result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 1, fee: 0.1 }))
    expect(result.current.trades).toHaveLength(2)
    act(() => result.current.loadSnapshot('盈利回撤'))
    expect(result.current.balance).toBe(9_999)
    expect(result.current.trades).toHaveLength(1)
    act(() => result.current.deleteSnapshot('盈利回撤'))
    expect(result.current.snapshots).toEqual([])
  })

  it('D15 exportAccountJson 导出含版本/余额/流水；importAccountJson 校验并恢复', () => {
    const { result } = renderHook(() => usePaperAccount())
    act(() => result.current.recordOpen({ symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 10, fee: 1 }))
    const json = result.current.exportAccountJson()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.balance).toBe(9_999)
    expect(parsed.trades).toHaveLength(1)
    // 破坏账户后从 JSON 恢复
    act(() => result.current.reset())
    expect(result.current.balance).toBe(10_000)
    act(() => {
      expect(result.current.importAccountJson(json)).toBe(true)
    })
    expect(result.current.balance).toBe(9_999)
    expect(result.current.trades).toHaveLength(1)
    // 无效输入 → false 且账户不变
    act(() => {
      expect(result.current.importAccountJson('not json')).toBe(false)
      expect(result.current.importAccountJson('{"balance":"x","trades":[]}')).toBe(false)
      expect(result.current.importAccountJson('{"balance":1,"trades":[{"symbol":123}]}')).toBe(false)
    })
    expect(result.current.balance).toBe(9_999)
  })
})
