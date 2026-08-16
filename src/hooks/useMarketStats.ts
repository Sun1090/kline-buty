import { useEffect, useState } from 'react'
import { fetchTicker24h, fetchFundingRate, fetchOpenInterest } from '../data/binance/rest'

export interface MarketStats {
  price: number | null
  changePct: number | null
  high: number | null
  low: number | null
  quoteVolume: number | null
  fundingRate: number | null
  markPrice: number | null
  nextFundingTime: number | null
  openInterest: number | null
}

const EMPTY: MarketStats = {
  price: null,
  changePct: null,
  high: null,
  low: null,
  quoteVolume: null,
  fundingRate: null,
  markPrice: null,
  nextFundingTime: null,
  openInterest: null,
}

const REFRESH_MS = 30_000

/**
 * 行情信息条数据：24h ticker + 资金费率 + 未平仓（30s 轮询）。
 * 各数据源独立容错：单一源失败不影响其他展示。
 */
export function useMarketStats(symbol: string): MarketStats {
  const [stats, setStats] = useState<MarketStats>(EMPTY)

  useEffect(() => {
    let alive = true

    const refresh = async () => {
      // 独立拉取，各源失败不影响整体
      const [ticker, funding, oi] = await Promise.allSettled([
        fetchTicker24h(symbol),
        fetchFundingRate(symbol),
        fetchOpenInterest(symbol),
      ])
      if (!alive) return
      const next = { ...EMPTY }
      if (ticker.status === 'fulfilled') {
        next.price = ticker.value.price
        next.changePct = ticker.value.changePct
        next.high = ticker.value.high
        next.low = ticker.value.low
        next.quoteVolume = ticker.value.quoteVolume
      }
      if (funding.status === 'fulfilled') {
        next.fundingRate = funding.value.lastFundingRate
        next.markPrice = funding.value.markPrice
        next.nextFundingTime = funding.value.nextFundingTime
      }
      if (oi.status === 'fulfilled') {
        next.openInterest = oi.value
      }
      setStats(next)
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [symbol])

  return stats
}
