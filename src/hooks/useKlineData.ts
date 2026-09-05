import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { MarketStore } from '../data/market'
import { fetchKlines } from '../data/binance/rest'
import { createKlineWs, type WsStatus } from '../data/binance/ws'
import { detectMode } from '../data/binance/endpoints'
import { generateSyntheticCandles, readPerfParam, tickSynthetic } from '../data/synthetic'
import { readCachedCandles, writeCachedCandles } from '../data/cache'
import { gapFillRanges, GAP_PAGE_SIZE } from '../data/gapFill'
import { createBatchScheduler } from '../utils/batchScheduler'
import { FrameGauge, type FrameStats } from '../utils/frameGauge'

const PAGE_SIZE = 500
/** 压测模式模拟实时帧的间隔（ms） */
const PERF_TICK_MS = 1500

/** 最近一次 WS 实时帧（驱动「最新价」实时跳动，让实时行情肉眼可见） */
export interface LiveTick {
  price: number
  /** 帧到达时间戳（ms），用作闪烁动画 key */
  ts: number
  /** 相对上一帧的方向：1 涨 / -1 跌 / 0 平 */
  dir: -1 | 0 | 1
}

export interface KlineDataState {
  candles: Candle[]
  status: 'loading' | 'error' | WsStatus
  error?: string
  live: LiveTick | null
}

/**
 * K 线数据编排：REST 历史 + WS 实时 合并进 MarketStore，
 * symbol/period 变化时整体重置；loadMore 向左分页加载更早数据。
 *
 * - `publish` 复制数组产生新引用：ChartView 依赖引用变化触发增量 `updateCandle`，
 *   否则 WS 帧只会改内存数组、图表序列永远不刷新（生产构建下图表冻结的根因）。
 * - 每帧同时更新 `live`（最新价 + 方向）：StatsBar 用它做实时跳动高亮，
 *   用户无需手动刷新即可感知行情在推送。
 * - StrictMode 双执行守卫：仅当前生效的 store 允许 publish，避免 dev 下双 store 竞态。
 * - `?perf=N`：合成数据压测模式（不联网），含模拟实时帧，供大数据量滚动/渲染验证。
 */
export function useKlineData(symbol: string, period: Period) {
  const [state, setState] = useState<KlineDataState>({ candles: [], status: 'loading', live: null })
  const [hasMore, setHasMore] = useState(true)
  /** E14 错误重试：重试计数，作为 effect 依赖触发整段重载 */
  const [retryNonce, setRetryNonce] = useState(0)
  /** N14 帧丢帧统计（压测模式/实时帧） */
  const [frameStats, setFrameStats] = useState<FrameStats | null>(null)
  const aliveRef = useRef(true)
  const storeRef = useRef<MarketStore | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    aliveRef.current = true
    // G15 请求取消：切换品种/周期或卸载时 abort 在途 REST（含重连补数），避免旧响应覆盖
    const abortCtrl = new AbortController()
    const store = new MarketStore()
    storeRef.current = store
    setHasMore(true)
    /** 上一帧收盘价（用于计算实时跳动方向）；REST 补数/切周期时重置 */
    let prevClose: number | null = null

    const publish = (live?: LiveTick) => {
      if (!aliveRef.current || storeRef.current !== store) return
      // 复制数组：新引用驱动 ChartView 增量装载（updateCandle），而非全量 setData
      setState((prev) => ({ ...prev, candles: store.all().slice(), live: live ?? prev.live }))
    }
    setState({ candles: [], status: 'loading', live: null })

    // 压测模式：合成大数据量 + 模拟实时帧，不依赖交易所网络
    const perfCount = readPerfParam()
    if (perfCount > 0) {
      const perf = generateSyntheticCandles(perfCount)
      store.upsertAll(perf)
      publish()
      setHasMore(false)
      setState((prev) => ({ ...prev, status: 'live' }))
      let tick = 0
      const gauge = new FrameGauge({ expectedMs: PERF_TICK_MS })
      // N14 周期性上报丢帧统计（每 8 帧一次，避免高频 setState）
      const statsTimer = window.setInterval(() => {
        if (!aliveRef.current) return
        setFrameStats(gauge.stats())
      }, PERF_TICK_MS * 8)
      const timer = window.setInterval(() => {
        if (!aliveRef.current) return
        gauge.tick(Date.now())
        const all = store.all()
        if (all.length === 0) return
        tick += 1
        const last = all[all.length - 1]
        const next = tickSynthetic(last, tick)
        store.upsert(next)
        const dir: -1 | 0 | 1 = next.close > last.close ? 1 : next.close < last.close ? -1 : 0
        publish({ price: next.close, ts: Date.now(), dir })
      }, PERF_TICK_MS)
      return () => {
        aliveRef.current = false
        window.clearInterval(timer)
        window.clearInterval(statsTimer)
        storeRef.current = null
      }
    }

    // A13：冷启动先读本地缓存秒开（校验失败/过期自动返回 null，静默降级）
    const cached = readCachedCandles(symbol, period)
    if (cached && cached.length > 0) {
      store.upsertAll(cached)
      publish()
    }

    fetchKlines(symbol, period, 800, undefined, undefined, abortCtrl.signal)
      .then((hist) => {
        store.upsertAll(hist)
        publish()
        // REST 首次成功：回写缓存供下次冷启动加速
        writeCachedCandles(symbol, period, hist)
      })
      .catch((e: unknown) => {
        if (aliveRef.current && storeRef.current === store) {
          setState({ candles: [], status: 'error', error: e instanceof Error ? e.message : String(e), live: null })
        }
      })

    let ws: ReturnType<typeof createKlineWs> | null = null
    // N8 WS 消息批处理：同帧多条 kline 合并一次 publish（避免每消息一次 setState+数组复制）
    let batchLast: { closes: number[]; frames: LiveTick[] } | null = null
    const batcher = createBatchScheduler(() => {
      if (!aliveRef.current || storeRef.current !== store) return
      const b = batchLast
      batchLast = null
      if (!b || b.frames.length === 0) return
      prevClose = b.closes[b.closes.length - 1] ?? null
      publish(b.frames[b.frames.length - 1])
    })
    // 探测端点模式（代理/直连）后建立 WS
    void detectMode().then((mode) => {
      if (!aliveRef.current) return
      ws = createKlineWs(symbol, period, {
        onKline: (c) => {
          store.upsert(c)
          // 同帧内合并方向与最新 tick，统一在下一帧 publish
          if (!batchLast) batchLast = { closes: [], frames: [] }
          batchLast.closes.push(c.close)
          batchLast.frames.push({
            price: c.close,
            ts: Date.now(),
            dir: prevClose == null ? 0 : c.close > prevClose ? 1 : c.close < prevClose ? -1 : 0,
          })
          batcher.schedule()
        },
        onStatus: (s) => {
          if (aliveRef.current) setState((prev) => ({ ...prev, status: s }))
        },
        onReconnect: () => {
          // G7 断线分段补洞：从本地最后时间戳起，按缺失区间逐段 REST 回补（串行）
          const all = store.all()
          const last = all[all.length - 1]
          if (!last) return
          const ranges = gapFillRanges(last.time, Date.now() / 1000, period)
          if (ranges.length === 0) return
          void ranges.reduce((p, r) => {
            return p.then(() =>
              fetchKlines(symbol, period, GAP_PAGE_SIZE, r.startTime, r.endTime, abortCtrl.signal)
                .then((hist) => {
                  if (!aliveRef.current || storeRef.current !== store) return
                  store.upsertAll(hist)
                  // 每段补完后发布：缺口区数据逐步浮现（末段即最新）
                  publish()
                })
                .catch(() => {}),
            )
          }, Promise.resolve())
        },
      }, undefined, mode)
    })

    return () => {
      aliveRef.current = false
      batcher.cancel()
      // G15 请求取消：中止在途 REST（初次加载 / 重连补数 / loadMore 之外的全部请求）
      abortCtrl.abort()
      ws?.close()
      storeRef.current = null
    }
  }, [symbol, period, retryNonce])

  /** E14 错误重试：递增计数，触发整段数据重载 */
  const retry = useCallback(() => setRetryNonce((n) => n + 1), [])

  /** N15 演示数据降级：网络不可用时注入合成 K 线（不阻塞、可交互演示） */
  const loadDemo = useCallback(() => {
    const store = storeRef.current
    if (!store || !aliveRef.current) return
    const demo = generateSyntheticCandles(800)
    store.upsertAll(demo)
    setHasMore(false)
    setState((prev) => ({ ...prev, candles: store.all().slice(), status: 'live', error: undefined }))
  }, [])

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

  return { state, hasMore, loadMore, retry, loadDemo, frameStats }
}
