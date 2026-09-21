// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { fetchRecentTrades } from '../../data/binance/rest'
import type { TradePrint } from '../../data/trades'
import { useRecentTrades } from '../useRecentTrades'

vi.mock('../../data/binance/rest', () => ({ fetchRecentTrades: vi.fn() }))

const rest = vi.mocked(fetchRecentTrades)

const print = (id: number): TradePrint => ({
  id,
  price: 100 + id,
  qty: 0.5,
  time: 1_700_000_000_000 + id * 1000,
  buy: id % 2 === 1,
})
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => print(from + i))

/** 让 effect 内的异步拉取（含 promise 链）全部落地 */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve()
  })
}
const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}

beforeEach(() => {
  vi.useFakeTimers()
  rest.mockReset()
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useRecentTrades', () => {
  it('首轮拉取后每 5s 累积新一页成交（重叠部分去重）', async () => {
    rest.mockResolvedValue(range(1, 3))
    const { result } = renderHook(() => useRecentTrades('BTCUSDT'))
    await flush()
    expect(result.current.map((t) => t.id)).toEqual([1, 2, 3])
    expect(rest).toHaveBeenCalledWith('BTCUSDT', 50, expect.any(AbortSignal))

    rest.mockResolvedValue(range(3, 5))
    await tick(5_000)
    expect(result.current.map((t) => t.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('重复轮询无新成交时保持同一引用', async () => {
    rest.mockResolvedValue(range(1, 3))
    const { result } = renderHook(() => useRecentTrades('BTCUSDT'))
    await flush()
    const first = result.current
    await tick(5_000)
    expect(result.current).toBe(first)
  })

  it('请求失败保留上一批成交', async () => {
    rest.mockResolvedValueOnce(range(1, 3)).mockRejectedValueOnce(new Error('network down'))
    const { result } = renderHook(() => useRecentTrades('BTCUSDT'))
    await flush()
    await tick(5_000)
    expect(result.current.map((t) => t.id)).toEqual([1, 2, 3])
    expect(rest).toHaveBeenCalledTimes(2)
  })

  it('切换品种清空旧成交并重新拉取', async () => {
    rest.mockResolvedValue(range(1, 3))
    const { result, rerender } = renderHook(({ symbol }: { symbol: string }) => useRecentTrades(symbol), {
      initialProps: { symbol: 'BTCUSDT' },
    })
    await flush()
    expect(result.current.map((t) => t.id)).toEqual([1, 2, 3])

    rest.mockResolvedValue(range(11, 13))
    rerender({ symbol: 'ETHUSDT' })
    expect(result.current).toEqual([])
    await flush()
    expect(result.current.map((t) => t.id)).toEqual([11, 12, 13])
  })

  it('卸载后停止轮询，并中止在途请求', async () => {
    const captured: { signal: AbortSignal | null } = { signal: null }
    rest.mockImplementation(async (_symbol, _limit, signal) => {
      captured.signal = signal ?? null
      return range(1, 3)
    })
    const { unmount } = renderHook(() => useRecentTrades('BTCUSDT'))
    await flush()
    expect(rest).toHaveBeenCalledTimes(1)

    unmount()
    await tick(20_000)
    expect(rest).toHaveBeenCalledTimes(1)
    expect(captured.signal?.aborted).toBe(true)
  })

  it('?perf 压测模式禁止真实 REST', async () => {
    window.history.replaceState({}, '', '/?perf=600')
    rest.mockResolvedValue(range(1, 3))
    const { result } = renderHook(() => useRecentTrades('BTCUSDT'))
    await flush()
    await tick(20_000)
    expect(result.current).toEqual([])
    expect(rest).not.toHaveBeenCalled()
  })
})
