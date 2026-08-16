import { useEffect, useState } from 'react'
import {
  fetchGlobalLongShortRatio,
  fetchOpenInterestHistory,
  fetchTakerBuySellRatio,
  fetchTopTraderPositionRatio,
  type OiPoint,
  type RatioPoint,
  type TakerPoint,
} from '../data/binance/rest'

export interface SentimentData {
  globalRatio: RatioPoint[]
  topTraderRatio: RatioPoint[]
  takerRatio: TakerPoint[]
  oiHistory: OiPoint[]
}

const EMPTY: SentimentData = { globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] }

const REFRESH_MS = 60_000

/**
 * 衍生品情绪数据：全账户/大户多空比 + 主动买卖量比 + 未平仓历史（60s 轮询）。
 * 各数据源独立容错：单一源失败不影响其他。
 */
export function useSentiment(symbol: string): SentimentData {
  const [data, setData] = useState<SentimentData>(EMPTY)

  useEffect(() => {
    let alive = true

    const refresh = async () => {
      const [globalRatio, topTraderRatio, takerRatio, oiHistory] = await Promise.allSettled([
        fetchGlobalLongShortRatio(symbol),
        fetchTopTraderPositionRatio(symbol),
        fetchTakerBuySellRatio(symbol),
        fetchOpenInterestHistory(symbol),
      ])
      if (!alive) return
      const next: SentimentData = { ...EMPTY }
      if (globalRatio.status === 'fulfilled') next.globalRatio = globalRatio.value
      if (topTraderRatio.status === 'fulfilled') next.topTraderRatio = topTraderRatio.value
      if (takerRatio.status === 'fulfilled') next.takerRatio = takerRatio.value
      if (oiHistory.status === 'fulfilled') next.oiHistory = oiHistory.value
      setData(next)
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [symbol])

  return data
}
