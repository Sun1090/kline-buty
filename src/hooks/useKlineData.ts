import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { MarketStore } from '../data/market'
import { fetchKlines } from '../data/binance/rest'
import { createKlineWs, type WsStatus } from '../data/binance/ws'
import { detectMode } from '../data/binance/endpoints'
import { generateSyntheticCandles, readPerfParam, tickSynthetic } from '../data/synthetic'

const PAGE_SIZE = 500
/** 压测模式模拟实时帧的间隔（ms） */
const PERF_TICK_MS = 1500

export interface KlineDataState {
  candles: Candle[]
  status: 'loading' | 'error' | WsStatus
  error?: string
}

/**
 * K 线数据编排：REST 历史 + WS 实时 合并进 MarketStore，
 * symbol/period 变化时整体重置；loadMore 向左分页加载更早数据。
 *
 * - `publish` 复制数组产生新引用：ChartView 依赖引用变化触发增量 `updateCandle`，
 *   否则 WS 帧只会改内存数组、图表序列永远不刷新（生产构建下图表冻结的根因）。
 * - StrictMode 双执行守卫：仅当前生效的 store 允许 publish，避免 dev 下双 store 竞态。
 * - `?perf=N`：合成数据压测模式（不联网），含模拟实时帧，供大数据量滚动/渲染验证。
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
      if (!aliveRef.current || storeRef.current !== store) return
      // 复制数组：新引用驱动 ChartView 增量装载（updateCandle），而非全量 setData
      setState((prev) => ({ ...prev, candles: store.all().slice() }))
    }
    setState({ candles: [], status: 'loading' })

    // 压测模式：合成大数据量 + 模拟实时帧，不依赖交易所网络
    const perfCount = readPerfParam()
    if (perfCount > 0) {
      const perf = generateSyntheticCandles(perfCount)
      store.upsertAll(perf)
      publish()
      setHasMore(false)
      setState((prev) => ({ ...prev, status: 'live' }))
      let tick = 0
      const timer = window.setInterval(() => {
        if (!aliveRef.current) return
        const all = store.all()
        if (all.length === 0) return
        tick += 1
        store.upsert(tickSynthetic(all[all.length - 1], tick))
        publish()
      }, PERF_TICK_MS)
      return () => {
        aliveRef.current = false
        window.clearInterval(timer)
        storeRef.current = null
      }
    }

    fetchKlines(symbol, period, 800)
      .then((hist) => {
        store.upsertAll(hist)
        publish()
      })
      .catch((e: unknown) => {
        if (aliveRef.current && storeRef.current === store) {
          setState({ candles: [], status: 'error', error: e instanceof Error ? e.message : String(e) })
        }
      })

    let ws: ReturnType<typeof createKlineWs> | null = null
    // 探测端点模式（代理/直连）后建立 WS
    void detectMode().then((mode) => {
      if (!aliveRef.current) return
      ws = createKlineWs(symbol, period, {
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
      }, undefined, mode)
    })

    return () => {
      aliveRef.current = false
      ws?.close()
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
        setState((prev) => ({ ...prev, candles: store.all().slice() }))
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
