import { useEffect, useState } from 'react'
import { fetchRecentTrades } from '../data/binance/rest'
import { mergeTrades, TAPE_CAP, type TradePrint } from '../data/trades'
import { isPerfMode } from '../data/synthetic'

/** 轮询间隔：最近成交单页 50 条已覆盖 5s 内的全部成交，5s 足够接近实时且不打爆限流 */
const REFRESH_MS = 5_000
const PAGE_SIZE = 50

/**
 * 最新逐笔成交：REST 轮询累积成 Tape（5s）。
 * ?perf 压测模式禁用真实 REST（保持空列表）；请求失败/取消保留上一批，切换品种即清空。
 */
export function useRecentTrades(symbol: string): TradePrint[] {
  const [trades, setTrades] = useState<TradePrint[]>([])

  useEffect(() => {
    if (isPerfMode()) return
    let alive = true
    let ctrl: AbortController | null = null
    setTrades([])

    const refresh = async () => {
      ctrl?.abort()
      ctrl = new AbortController()
      try {
        const page = await fetchRecentTrades(symbol, PAGE_SIZE, ctrl.signal)
        if (!alive) return
        setTrades((prev) => mergeTrades(prev, page, TAPE_CAP))
      } catch {
        /* 网络失败/被取消：保留上一批成交 */
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)

    return () => {
      alive = false
      window.clearInterval(timer)
      ctrl?.abort()
    }
  }, [symbol])

  return trades
}
