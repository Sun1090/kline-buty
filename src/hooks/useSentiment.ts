import { useEffect, useState } from 'react'
import { isPerfMode } from '../data/synthetic'
import { isSymbolNotFound } from '../data/binance/errors'
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
 *
 * `enabled`（默认开）：这四个端点全是合约专属数据，而数据只有情绪面板一个消费者——
 * 面板关着就不该每分钟打四次没人看的请求（面板默认就是关的）。
 */
export function useSentiment(symbol: string, enabled = true): SentimentData {
  const [data, setData] = useState<SentimentData>(EMPTY)

  useEffect(() => {
    if (isPerfMode() || !enabled) return // ?perf 压测：禁止真实 fapi/dapi REST（数据保持空）
    let alive = true
    // 该品种压根没有合约口径的数据（现货专属品种）：400 会永远 400，别再一轮一轮地打
    let noFuturesMarket = false

    const refresh = async () => {
      const [globalRatio, topTraderRatio, takerRatio, oiHistory] = await Promise.allSettled([
        fetchGlobalLongShortRatio(symbol),
        fetchTopTraderPositionRatio(symbol),
        fetchTakerBuySellRatio(symbol),
        fetchOpenInterestHistory(symbol),
      ])
      if (!alive) return
      // 判据是「四个端点同时 400」，不是「有一个 400」：合约品种里单个端点参数不合
      // （如 openInterestHist 的周期不支持）也回 400，一把 latch 会把好的三个源一起停掉
      const allNotFound = [globalRatio, topTraderRatio, takerRatio, oiHistory].every(
        (r) => r.status === 'rejected' && isSymbolNotFound(r.reason),
      )
      if (allNotFound) {
        noFuturesMarket = true
        setData(EMPTY)
        return
      }
      const next: SentimentData = { ...EMPTY }
      if (globalRatio.status === 'fulfilled') next.globalRatio = globalRatio.value
      if (topTraderRatio.status === 'fulfilled') next.topTraderRatio = topTraderRatio.value
      if (takerRatio.status === 'fulfilled') next.takerRatio = takerRatio.value
      if (oiHistory.status === 'fulfilled') next.oiHistory = oiHistory.value
      setData(next)
    }

    void refresh()
    const timer = window.setInterval(() => {
      if (!noFuturesMarket) void refresh()
    }, REFRESH_MS)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [symbol, enabled])

  return data
}
