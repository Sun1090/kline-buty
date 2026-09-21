import { useEffect, useMemo, useState } from 'react'
import { fetchTickers24h } from '../data/binance/rest'
import { isPerfMode } from '../data/synthetic'

/** 轮询间隔：与提醒多品种价源同频（30s），挂单撮合精度与站内提醒一致 */
const REFRESH_MS = 30_000

/**
 * 指定品种集合的最新价表（REST 批量 24h ticker，30s 轮询）。
 * 供非当前图表品种的限价挂单撮合使用：拉取失败保留旧价，品种集合变化即重新拉取。
 * ?perf 压测模式禁止真实 REST（此价表保持空，撮合只由合成 K 线最新价驱动）。
 */
export function useSymbolPrices(symbols: string[]): Record<string, number> {
  const key = useMemo(() => Array.from(new Set(symbols)).sort().join(','), [symbols])
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (isPerfMode()) return
    const list = key === '' ? [] : key.split(',')
    if (list.length === 0) return
    let alive = true

    const load = async () => {
      try {
        const rows = await fetchTickers24h(list)
        if (!alive) return
        setPrices((prev) => {
          const next = { ...prev }
          for (const row of rows) next[row.symbol] = row.price
          return next
        })
      } catch {
        /* 拉取失败保留旧价格 */
      }
    }

    void load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [key])

  return prices
}
