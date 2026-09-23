// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { BinanceHttpError } from '../../data/binance/errors'
import { useMarketStats } from '../useMarketStats'

const { fetchTicker24h, fetchFundingRate, fetchOpenInterest } = vi.hoisted(() => ({
  fetchTicker24h: vi.fn(),
  fetchFundingRate: vi.fn(),
  fetchOpenInterest: vi.fn(),
}))

vi.mock('../../data/binance/rest', () => ({
  fetchTicker24h,
  fetchFundingRate,
  fetchOpenInterest,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

const ticker = { price: 63000, changePct: 2.5, high: 64000, low: 62000, quoteVolume: 1.2e9 }
const funding = { lastFundingRate: 0.0001, markPrice: 63005, nextFundingTime: 1725000000000 }

describe('useMarketStats（行情信息条 30s 轮询，各源独立容错）', () => {
  it('三源全部成功 → 汇总全部字段，30s 轮询，卸载清理', async () => {
    fetchTicker24h.mockResolvedValue(ticker)
    fetchFundingRate.mockResolvedValue(funding)
    fetchOpenInterest.mockResolvedValue(12345)
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    const { result, unmount } = renderHook(() => useMarketStats('BTCUSDT'))
    await vi.waitFor(() => expect(result.current.price).toBe(63000))
    expect(result.current).toEqual({
      price: 63000,
      changePct: 2.5,
      high: 64000,
      low: 62000,
      quoteVolume: 1.2e9,
      fundingRate: 0.0001,
      markPrice: 63005,
      nextFundingTime: 1725000000000,
      openInterest: 12345,
    })

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('单一源失败不影响其余字段', async () => {
    fetchTicker24h.mockRejectedValue(new Error('ticker down'))
    fetchFundingRate.mockResolvedValue(funding)
    fetchOpenInterest.mockResolvedValue(789)
    const { result } = renderHook(() => useMarketStats('BTCUSDT'))
    await vi.waitFor(() => expect(result.current.fundingRate).toBe(0.0001))
    expect(result.current.price).toBeNull()
    expect(result.current.openInterest).toBe(789)
  })

  it('全部源失败 → 保持空态，不抛错', async () => {
    fetchTicker24h.mockRejectedValue(new Error('x'))
    fetchFundingRate.mockRejectedValue(new Error('x'))
    fetchOpenInterest.mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useMarketStats('BTCUSDT'))
    await vi.waitFor(() => expect(result.current.openInterest).toBeNull())
    expect(result.current).toEqual({
      price: null,
      changePct: null,
      high: null,
      low: null,
      quoteVolume: null,
      fundingRate: null,
      markPrice: null,
      nextFundingTime: null,
      openInterest: null,
    })
  })

  it('切换 symbol → effect 重跑并按新品种请求', async () => {
    fetchTicker24h.mockResolvedValue(ticker)
    fetchFundingRate.mockResolvedValue(funding)
    fetchOpenInterest.mockResolvedValue(1)
    const { result, rerender } = renderHook(({ symbol }: { symbol: string }) => useMarketStats(symbol), {
      initialProps: { symbol: 'BTCUSDT' },
    })
    await vi.waitFor(() => expect(fetchTicker24h).toHaveBeenCalledWith('BTCUSDT'))

    fetchTicker24h.mockResolvedValue({ ...ticker, price: 2900 })
    rerender({ symbol: 'ETHUSDT' })
    await vi.waitFor(() => expect(fetchTicker24h).toHaveBeenCalledWith('ETHUSDT'))
    await vi.waitFor(() => expect(result.current.price).toBe(2900))
  })

  it('合约端点回 400（现货-only 品种）→ 后续轮询不再打这两个端点', async () => {
    vi.useFakeTimers()
    fetchTicker24h.mockResolvedValue(ticker)
    fetchFundingRate.mockRejectedValue(new BinanceHttpError('binance http 400', 400))
    fetchOpenInterest.mockRejectedValue(new BinanceHttpError('binance http 400', 400))

    const { result } = renderHook(() => useMarketStats('SHIBUSDT'))
    await vi.waitFor(() => expect(result.current.price).toBe(63000))
    expect(fetchFundingRate).toHaveBeenCalledTimes(1)
    expect(fetchOpenInterest).toHaveBeenCalledTimes(1)
    expect(result.current.fundingRate).toBeNull()
    expect(result.current.openInterest).toBeNull()
    // 信息条照常展示现货侧字段：现货/合约徽标依赖这些字段是否为 null，跳过端点不改变判定

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchFundingRate).toHaveBeenCalledTimes(1)
    expect(fetchOpenInterest).toHaveBeenCalledTimes(1)
    expect(fetchTicker24h).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('网络错误 / 5xx 不算「品种不存在」→ 下一个 30s 仍然重试', async () => {
    vi.useFakeTimers()
    fetchTicker24h.mockResolvedValue(ticker)
    fetchFundingRate.mockRejectedValue(new Error('binance http 503'))
    fetchOpenInterest.mockRejectedValue(new Error('binance http 503'))

    renderHook(() => useMarketStats('BTCUSDT'))
    await vi.waitFor(() => expect(fetchFundingRate).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchFundingRate).toHaveBeenCalledTimes(2)
    expect(fetchOpenInterest).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
