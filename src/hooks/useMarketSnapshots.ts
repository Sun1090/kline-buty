import { useEffect, useState } from 'react'
import { fetchTicker24h, fetchKlines } from '../data/binance/rest'
import type { Period } from '../chart/types'

export interface MarketSnapshot {
  symbol: string
  price: number
  changePct: number
  spark: number[]
}

/** 交易对列表行情快照：最新价 + 24h 涨跌 + 日线迷你图 */
export function useMarketSnapshots(symbols: string[]) {
  const [snapshots, setSnapshots] = useState<Record<string, MarketSnapshot>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all(
      symbols.map(async (symbol) => {
        const [ticker, klines] = await Promise.all([
          fetchTicker24h(symbol),
          fetchKlines(symbol, '1d' as Period, 30),
        ])
        return {
          symbol,
          price: ticker.price,
          changePct: ticker.changePct,
          spark: klines.map((k) => k.close),
        }
      }),
    )
      .then((list) => {
        if (!alive) return
        setSnapshots(Object.fromEntries(list.map((x) => [x.symbol, x])))
      })
      .catch(() => {
        /* 快照失败不阻塞主图表 */
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [symbols])

  return { snapshots, loading }
}
