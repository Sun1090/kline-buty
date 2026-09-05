// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useMarketSnapshots } from '../useMarketSnapshots'

const { fetchTicker24h, fetchKlines } = vi.hoisted(() => ({
  fetchTicker24h: vi.fn(),
  fetchKlines: vi.fn(),
}))

vi.mock('../../data/binance/rest', () => ({
  fetchTicker24h,
  fetchKlines,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ticker = { price: 63000, changePct: 2.5 }

describe('useMarketSnapshots（列表行情快照：最新价 + 24h 涨跌 + 日线 spark）', () => {
  it('全部成功 → 汇总 price/changePct/spark，loading 复位', async () => {
    fetchTicker24h.mockResolvedValue(ticker)
    fetchKlines.mockResolvedValue([{ close: 100 }, { close: 101 }, { close: 99 }])
    const { result } = renderHook(() => useMarketSnapshots(['BTCUSDT']))
    expect(result.current.loading).toBe(true)
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.snapshots).toEqual({
      BTCUSDT: { symbol: 'BTCUSDT', price: 63000, changePct: 2.5, spark: [100, 101, 99] },
    })
  })

  it('某品种拉取失败 → catch 吞掉，保持空快照且不阻塞', async () => {
    fetchTicker24h.mockResolvedValue(ticker)
    fetchKlines.mockRejectedValue(new Error('klines down'))
    const { result } = renderHook(() => useMarketSnapshots(['BTCUSDT']))
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.snapshots).toEqual({})
  })

  it('symbols 变化 → effect 重跑并按新品种请求', async () => {
    fetchTicker24h.mockResolvedValue(ticker)
    fetchKlines.mockResolvedValue([{ close: 1 }])
    const { result, rerender } = renderHook(({ symbols }: { symbols: string[] }) => useMarketSnapshots(symbols), {
      initialProps: { symbols: ['BTCUSDT'] },
    })
    await vi.waitFor(() => expect(fetchKlines).toHaveBeenCalledWith('BTCUSDT', '1d', 30))

    rerender({ symbols: ['ETHUSDT'] })
    await vi.waitFor(() => expect(fetchKlines).toHaveBeenCalledWith('ETHUSDT', '1d', 30))
    await vi.waitFor(() => expect(result.current.snapshots.ETHUSDT).toBeDefined())
  })

  it('卸载后不 setState（alive 守卫）', async () => {
    let resolveKlines: (v: unknown) => void = () => {}
    fetchTicker24h.mockResolvedValue(ticker)
    fetchKlines.mockReturnValue(
      new Promise((resolve) => {
        resolveKlines = resolve
      }),
    )
    const { result, unmount } = renderHook(() => useMarketSnapshots(['BTCUSDT']))
    unmount()
    resolveKlines([{ close: 1 }])
    await Promise.resolve()
    // alive=false → 不写入快照、不清 loading
    expect(result.current.snapshots).toEqual({})
  })
})
