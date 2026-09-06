import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candle, Period } from '../chart/types'
import { MarketStore } from '../data/market'
import { fetchKlines } from '../data/binance/rest'
import { createKlineWs, type WsStatus } from '../data/binance/ws'
import { detectMode } from '../data/binance/endpoints'
import { generateSyntheticCandles, readPerfParam, tickSynthetic } from '../data/synthetic'
import { readCachedCandles, writeCachedCandles } from '../data/cache'
import { gapFillRanges, GAP_PAGE_SIZE, runRefillPages, type RefillProgress } from '../data/gapFill'
import { alignTimeToPeriod, normalizeCandles, periodSpanMs } from '../data/align'
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
  /** A3 断线补洞进度：非空时表示正在分段 REST 回补缺失区间（UI 提示 done/total） */
  refill: RefillProgress | null
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
  const [state, setState] = useState<KlineDataState>({ candles: [], status: 'loading', live: null, refill: null })
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
    setState({ candles: [], status: 'loading', live: null, refill: null })

    // 压测模式：合成大数据量 + 模拟实时帧，不依赖交易所网络
    const perfCount = readPerfParam()
    if (perfCount > 0) {
      // A1 周期感知：合成步长与起点对齐当前周期（切周期后重新生成对应间隔），
      // 供压测/切周期稳定性验证（E2E 依 window.__klineButyPerf 断言边界对齐与序列间隔）
      const perf = generateSyntheticCandles(perfCount, { period })
      store.upsertAll(normalizeCandles(perf, period))
      const syncPerfHook = () => {
        window.__klineButyPerf = {
          period,
          candles: store.all().map((c: { time: number; open: number; high: number; low: number; close: number; volume: number }) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })),
        }
      }
      publish()
      syncPerfHook()
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
        syncPerfHook()
      }, PERF_TICK_MS)
      return () => {
        aliveRef.current = false
        window.clearInterval(timer)
        window.clearInterval(statsTimer)
        storeRef.current = null
        delete window.__klineButyPerf
      }
    }

    // A13：冷启动先读本地缓存秒开（校验失败/过期自动返回 null，静默降级）。
    // A1：读入即归一化——坏缓存/历史版本的非对齐时间戳在此被修复，不进图表。
    const cached = readCachedCandles(symbol, period)
    if (cached && cached.length > 0) {
      store.upsertAll(normalizeCandles(cached, period))
      publish()
    }

    fetchKlines(symbol, period, 800, undefined, undefined, abortCtrl.signal)
      .then((hist) => {
        // A1：归一化后再入 store 与缓存（自定义源非对齐时间戳在此修正）
        const norm = normalizeCandles(hist, period)
        store.upsertAll(norm)
        publish()
        // REST 首次成功：回写缓存供下次冷启动加速（写入即对齐，二次冷启动不再需修复）
        writeCachedCandles(symbol, period, norm)
      })
      .catch((e: unknown) => {
        if (aliveRef.current && storeRef.current === store) {
          setState({ candles: [], status: 'error', error: e instanceof Error ? e.message : String(e), live: null, refill: null })
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
          // A1：实时帧单根对齐周期边界（币安本身对齐，防御自定义源/缓存中的非对齐帧）
          const aligned = c.time === alignTimeToPeriod(c.time, period) ? c : { ...c, time: alignTimeToPeriod(c.time, period) }
          store.upsert(aligned)
          // 同帧内合并方向与最新 tick，统一在下一帧 publish
          if (!batchLast) batchLast = { closes: [], frames: [] }
          batchLast.closes.push(aligned.close)
          batchLast.frames.push({
            price: aligned.close,
            ts: Date.now(),
            dir: prevClose == null ? 0 : aligned.close > prevClose ? 1 : aligned.close < prevClose ? -1 : 0,
          })
          batcher.schedule()
        },
        onStatus: (s) => {
          if (aliveRef.current) setState((prev) => ({ ...prev, status: s }))
        },
        onReconnect: () => {
          // A3 断线分段补洞：从本地最后时间戳起，按缺失区间逐段 REST 回补（串行）。
          // 每段补完上报进度（done/total），UI 显示「断线回补中」；失败页跳过继续；完成后归零。
          const all = store.all()
          const last = all[all.length - 1]
          if (!last) return
          const ranges = gapFillRanges(last.time, Date.now() / 1000, period)
          if (ranges.length === 0) return
          setState((prev) => ({ ...prev, refill: { done: 0, total: ranges.length, failed: 0 } }))
          const finish = () => {
            if (aliveRef.current) setState((prev) => ({ ...prev, refill: null }))
          }
          void runRefillPages(
            ranges,
            (r) =>
              fetchKlines(symbol, period, GAP_PAGE_SIZE, r.startTime, r.endTime, abortCtrl.signal).then(
                (hist) => {
                  if (!aliveRef.current || storeRef.current !== store) return
                  // A1：补洞数据同样归一化后入 store（游标按对齐起点计算，返回序列对齐）
                  store.upsertAll(normalizeCandles(hist, period))
                  // 每段补完后发布：缺口区数据逐步浮现（末段即最新）
                  publish()
                },
              ),
            (p) => {
              if (aliveRef.current) setState((prev) => ({ ...prev, refill: p }))
            },
          )
            .then(finish)
            .catch(finish)
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
    // A1：演示数据同样归一化（生成器缺省对齐 1m，防御自定义步长来源的非对齐时间戳）
    store.upsertAll(normalizeCandles(demo, period))
    setHasMore(false)
    setState((prev) => ({ ...prev, candles: store.all().slice(), status: 'live', error: undefined }))
  }, [period])

  /** 向左分页：以最早一根的 openTime 为终点（排除首根自身），往前取一页新数据 */
  const loadMore = useCallback(async () => {
    const store = storeRef.current
    if (!store || loadingMoreRef.current) return
    const first = store.all()[0]
    if (!first) return
    loadingMoreRef.current = true
    try {
      // A1：endTime 取 first.time-1ms（排除已存在的首根 → 翻满一页新数据）；
      // startTime 用 periodSpanMs（1M 取 31 天上界，防 30 天近似导致窗口偏窄误判 hasMore=false）
      const endTime = first.time * 1000 - 1
      const hist = await fetchKlines(symbol, period, PAGE_SIZE, endTime - periodSpanMs(period, PAGE_SIZE), endTime)
      if (aliveRef.current && hist.length > 0) {
        // A1：分页数据归一化后入 store（游标基于已对齐首根，返回序列对齐）
        store.upsertAll(normalizeCandles(hist, period))
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
