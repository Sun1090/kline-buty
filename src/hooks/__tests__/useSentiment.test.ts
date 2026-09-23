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

  /** 四个情绪端点各自的应答码（其余路径如 detectMode 的 ping 一律 404） */
  const SENTIMENT_PATHS = [
    '/futures/data/globalLongShortAccountRatio',
    '/futures/data/topLongShortPositionRatio',
    '/futures/data/takerlongshortRatio',
    '/futures/data/openInterestHist',
  ]
  function mockStatuses(byPath: Record<string, number>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const hit = SENTIMENT_PATHS.find((p) => String(input).includes(p))
        const status = hit ? (byPath[hit] ?? 200) : 404
        return { ok: status < 400, status, json: async () => (status < 400 ? ratio : {}) }
      }),
    )
  }
  const allStatus = (status: number) =>
    Object.fromEntries(SENTIMENT_PATHS.map((p) => [p, status])) as Record<string, number>
  const countSentimentCalls = () =>
    vi.mocked(fetch).mock.calls.filter(([u]) => SENTIMENT_PATHS.some((p) => String(u).includes(p))).length

  it('面板关着（enabled=false）→ 一个情绪请求都不发，空到空也保持空态', async () => {
    mockStatuses({})
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useSentiment('BTCUSDT', open), {
      initialProps: { open: false },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(countSentimentCalls()).toBe(0)
    expect(result.current).toEqual({ globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] })

    // 打开面板的那一瞬间才开始拉
    rerender({ open: true })
    await act(async () => {
      await Promise.resolve()
    })
    expect(countSentimentCalls()).toBeGreaterThanOrEqual(4)
  })

  it('四个端点全部 400（该品种没有合约口径）→ 拉一轮就停，后续 60s 不再打', async () => {
    mockStatuses(allStatus(400))
    const { result } = renderHook(() => useSentiment('SHIBUSDT', true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current).toEqual({ globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] })
    const afterFirstRound = countSentimentCalls()
    expect(afterFirstRound).toBe(4)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000 * 3)
    })
    expect(countSentimentCalls()).toBe(afterFirstRound)
  })

  it('只有单个端点 400 → 其余源继续按 60s 轮询（latch 不能误伤）', async () => {
    mockStatuses({ ...allStatus(200), '/futures/data/openInterestHist': 400 })
    const { result } = renderHook(() => useSentiment('BTCUSDT', true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.globalRatio).toHaveLength(1)
    expect(result.current.oiHistory).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(countSentimentCalls()).toBe(8)
  })
})
