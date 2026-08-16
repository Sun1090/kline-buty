import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { MarketStore } from '../data/market'
import { fetchKlines } from '../data/binance/rest'
import { createKlineWs, type WsStatus } from '../data/binance/ws'

const PAGE_SIZE = 500

export interface KlineDataState {
  candles: Candle[]
  status: 'loading' | 'error' | WsStatus
  error?: string
}

/**
 * K 线数据编排：REST 历史 + WS 实时 合并进 MarketStore，
 * symbol/period 变化时整体重置；loadMore 向左分页加载更早数据。
 */
export function useKlineData(symbol: string, period: Period) {
  const [state, setState] = useState<KlineDataState>({ candles: [], status: 'loading' })
  const [hasMore, setHasMore] = useState(true)
  const aliveRef = useRef(true)
  const storeRef = useRef<MarketStore | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    aliveRef.current = true
    const store = new MarketStore()
    storeRef.current = store
    setHasMore(true)

    const publish = () => {
      if (aliveRef.current) setState((prev) => ({ ...prev, candles: store.all() }))
    }
    setState({ candles: [], status: 'loading' })

    fetchKlines(symbol, period, 800)
      .then((hist) => {
        store.upsertAll(hist)
        publish()
      })
      .catch((e: unknown) => {
        if (aliveRef.current) {
          setState({ candles: [], status: 'error', error: e instanceof Error ? e.message : String(e) })
        }
      })

    const ws = createKlineWs(symbol, period, {
      onKline: (c) => {
        store.upsert(c)
        publish()
      },
      onStatus: (s) => {
        if (aliveRef.current) setState((prev) => ({ ...prev, status: s }))
      },
      onReconnect: () => {
        fetchKlines(symbol, period, 100)
          .then((hist) => {
            store.upsertAll(hist)
            publish()
          })
          .catch(() => {})
      },
    })

    return () => {
      aliveRef.current = false
      ws.close()
      storeRef.current = null
    }
  }, [symbol, period])

  /** 向左分页：以最早一根的 openTime 为终点，往前取一页 */
  const loadMore = useCallback(async () => {
    const store = storeRef.current
    if (!store || loadingMoreRef.current) return
    const first = store.all()[0]
    if (!first) return
    loadingMoreRef.current = true
    try {
      const endTime = first.time * 1000
      const hist = await fetchKlines(symbol, period, PAGE_SIZE, endTime - PAGE_SIZE * PERIOD_MS[period], endTime)
      if (aliveRef.current && hist.length > 0) {
        store.upsertAll(hist)
        setState((prev) => ({ ...prev, candles: store.all() }))
      }
      if (aliveRef.current && hist.length < PAGE_SIZE) setHasMore(false)
    } catch {
      // 加载失败静默，下次滚动再试
    } finally {
      loadingMoreRef.current = false
    }
  }, [symbol, period])

  return { state, hasMore, loadMore }
}
