// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useTickerList, sortTickerRows } from '../useTickerList'
import { fetchTickers24h } from '../../data/binance/rest'

vi.mock('../../data/binance/rest', () => ({
  fetchTickers24h: vi.fn(),
}))

const mockFetch = vi.mocked(fetchTickers24h)

// 注意：必须用模块级稳定引用传参（数组字面量会在每次 re-render 重建，
// 使 useCallback([symbols]) 依赖变化 → effect 重跑 → 渲染循环）
const SYMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

const rows = [
  { symbol: 'ETHUSDT', price: 3200.1, changePct: -0.45, quoteVolume: 5e8 },
  { symbol: 'BTCUSDT', price: 63000.5, changePct: 1.23, quoteVolume: 1e9 },
  { symbol: 'SOLUSDT', price: 0.5, changePct: 3.45, quoteVolume: 1e5 },
]

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('sortTickerRows', () => {
  it('symbol 列：asc 字典序 / desc 反序', () => {
    const asc = sortTickerRows(rows, 'symbol', 'asc').map((r) => r.symbol)
    expect(asc).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
    const desc = sortTickerRows(rows, 'symbol', 'desc').map((r) => r.symbol)
    expect(desc).toEqual(['SOLUSDT', 'ETHUSDT', 'BTCUSDT'])
  })

  it('price 列：数字升序 / 降序', () => {
    const asc = sortTickerRows(rows, 'price', 'asc').map((r) => r.symbol)
    expect(asc).toEqual(['SOLUSDT', 'ETHUSDT', 'BTCUSDT'])
    expect(sortTickerRows(rows, 'price', 'desc')[0].symbol).toBe('BTCUSDT')
  })

  it('changePct 列：升序 / 降序', () => {
    expect(sortTickerRows(rows, 'changePct', 'asc')[0].changePct).toBe(-0.45)
    expect(sortTickerRows(rows, 'changePct', 'desc')[0].changePct).toBe(3.45)
  })

  it('quoteVolume 列：升序 / 降序', () => {
    expect(sortTickerRows(rows, 'quoteVolume', 'asc')[0].quoteVolume).toBe(1e5)
    expect(sortTickerRows(rows, 'quoteVolume', 'desc')[0].quoteVolume).toBe(1e9)
  })

  it('不修改原数组', () => {
    const copy = [...rows]
    sortTickerRows(rows, 'price', 'desc')
    expect(rows).toEqual(copy)
  })
})

describe('useTickerList', () => {
  it('拉取成功后 rows 就绪，默认 symbol 升序', async () => {
    mockFetch.mockResolvedValue([...rows])
    const { result } = renderHook(() => useTickerList(SYMS))
    await act(async () => {})
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(false)
    expect(result.current.rows.map((r) => r.symbol)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
    expect(result.current.sortKey).toBe('symbol')
    expect(result.current.sortDir).toBe('asc')
  })

  it('同列再点 → 切换升降序；换列 → 重置为升序', async () => {
    mockFetch.mockResolvedValue([...rows])
    const { result } = renderHook(() => useTickerList(SYMS))
    await act(async () => {})
    act(() => result.current.setSortKey('price'))
    expect(result.current.sortKey).toBe('price')
    expect(result.current.sortDir).toBe('asc')
    expect(result.current.rows[0].symbol).toBe('SOLUSDT')
    act(() => result.current.setSortKey('price'))
    expect(result.current.sortDir).toBe('desc')
    expect(result.current.rows[0].symbol).toBe('BTCUSDT')
    act(() => result.current.setSortKey('symbol'))
    expect(result.current.sortKey).toBe('symbol')
    expect(result.current.sortDir).toBe('asc')
  })

  it('拉取失败：error 标记，不抛错', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useTickerList(SYMS))
    await act(async () => {})
    expect(result.current.error).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.rows).toHaveLength(0)
  })

  it('刷新失败保留旧数据（不覆盖）', async () => {
    mockFetch.mockResolvedValueOnce([...rows]).mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useTickerList(SYMS))
    await act(async () => {})
    expect(result.current.rows).toHaveLength(3)
    act(() => {
      result.current.refresh()
    })
    await act(async () => {})
    expect(result.current.error).toBe(true)
    expect(result.current.rows).toHaveLength(3)
  })

  it('手动刷新成功清除 error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([...rows])
    const { result } = renderHook(() => useTickerList(SYMS))
    await act(async () => {})
    expect(result.current.error).toBe(true)
    act(() => {
      result.current.refresh()
    })
    await act(async () => {})
    expect(result.current.error).toBe(false)
    expect(result.current.rows).toHaveLength(3)
  })
})
