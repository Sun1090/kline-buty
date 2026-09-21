// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useSymbolPrices } from '../useSymbolPrices'
import { __resetModeForTests } from '../../data/binance/endpoints'

const ticker = (symbol: string, price: number) => ({
  symbol,
  lastPrice: String(price),
  priceChangePercent: '1',
  quoteVolume: '1',
})

/** 按 fetchTickers24h 的两种请求形态打桩：批量 symbols= 数组、单个 symbol= 降级 */
function serve(prices: Record<string, number>) {
  const fetchMock = vi.fn(async (input: string) => {
    const url = String(input)
    if (url.includes('/api/v3/ping')) return { ok: true, headers: { get: () => 'application/json' } }
    if (url.includes('symbols=')) {
      const list = JSON.parse(decodeURIComponent(url.slice(url.indexOf('symbols=') + 8))) as string[]
      return { ok: true, json: async () => list.filter((s) => prices[s] != null).map((s) => ticker(s, prices[s])) }
    }
    const match = /symbol=([^&]+)/.exec(url)
    const sym = match ? decodeURIComponent(match[1]) : ''
    if (prices[sym] != null) return { ok: true, json: async () => ticker(sym, prices[sym]) }
    return { ok: true, json: async () => [] }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const tickerCalls = (mock: ReturnType<typeof serve>) =>
  mock.mock.calls.filter((c) => String(c[0]).includes('ticker/24hr')).length

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  __resetModeForTests()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  __resetModeForTests()
})

describe('useSymbolPrices', () => {
  it('按品种集合拉取最新价，30s 轮询更新且保留失败品种的旧价', async () => {
    serve({ BTCUSDT: 60000, ETHUSDT: 3000 })
    const { result } = renderHook(() => useSymbolPrices(['BTCUSDT', 'ETHUSDT']))
    await flush()
    expect(result.current).toEqual({ BTCUSDT: 60000, ETHUSDT: 3000 })

    // 第二轮 ETH 下架（返回缺项）→ 保留上一轮价格，BTC 更新
    serve({ BTCUSDT: 61000 })
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await flush()
    expect(result.current).toEqual({ BTCUSDT: 61000, ETHUSDT: 3000 })
  })

  it('品种集合去重作为轮询键；空集合不发请求', async () => {
    const empty = serve({})
    const { rerender } = renderHook(({ symbols }: { symbols: string[] }) => useSymbolPrices(symbols), {
      initialProps: { symbols: [] as string[] },
    })
    await flush()
    expect(tickerCalls(empty)).toBe(0)

    const mock = serve({ BTCUSDT: 60000 })
    rerender({ symbols: ['BTCUSDT', 'BTCUSDT'] })
    await flush()
    expect(tickerCalls(mock)).toBe(1)
  })
})
