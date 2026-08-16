// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useSentiment } from '../useSentiment'

const ratio = [
  { symbol: 'BTCUSDT', longAccount: '0.6724', longShortRatio: '2.0525', shortAccount: '0.3276', timestamp: 1786860000000 },
]
const taker = [{ buySellRatio: '0.9346', sellVol: '354.7610', buyVol: '331.5500', timestamp: 1786860000000 }]
const oi = [
  { symbol: 'BTCUSDT', sumOpenInterest: '111331.031', sumOpenInterestValue: '7016972221.868', timestamp: 1786866300000 },
]

function mockFetchFor(paths: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      if (input.includes('/futures/data/globalLongShortAccountRatio')) {
        return { ok: true, json: async () => ratio }
      }
      if (input.includes('/futures/data/topLongShortPositionRatio')) {
        return { ok: true, json: async () => ratio }
      }
      if (input.includes('/futures/data/takerlongshortRatio')) {
        return { ok: true, json: async () => taker }
      }
      if (input.includes('/futures/data/openInterestHist')) {
        return { ok: true, json: async () => oi }
      }
      paths.push(input)
      return { ok: false, status: 404 }
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useSentiment', () => {
  it('拉取 4 类情绪数据并解析（各源独立）', async () => {
    const paths: string[] = []
    mockFetchFor(paths)
    const { result } = renderHook(() => useSentiment('BTCUSDT'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.globalRatio).toHaveLength(1)
    expect(result.current.globalRatio[0].longShortRatio).toBe(2.0525)
    expect(result.current.topTraderRatio).toHaveLength(1)
    expect(result.current.takerRatio[0].buySellRatio).toBe(0.9346)
    expect(result.current.oiHistory[0].oi).toBe(111331.031)
  })

  it('切换 symbol 重新拉取', async () => {
    const paths: string[] = []
    mockFetchFor(paths)
    const { result, rerender } = renderHook(({ symbol }) => useSentiment(symbol), {
      initialProps: { symbol: 'BTCUSDT' },
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ symbol: 'ETHUSDT' })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.oiHistory).toHaveLength(1)
    // 至少触发过两次拉取（BTC + ETH）
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(8)
  })
})
