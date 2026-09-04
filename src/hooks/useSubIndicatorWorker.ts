import { useEffect, useRef, useState } from 'react'
import type { Candle } from '../chart/types'
import type { IndicatorParams } from '../indicators/params'
import { workerSubLines, type WorkerLineRequest, type WorkerLineResponse } from '../indicators/workerLines'
import type { ValuePoint } from '../indicators/sma'

/**
 * H13 指标计算 worker 客户端。
 *
 * 大数据量（≥ WORKER_THRESHOLD）时把副图指标线计算委托给 Web Worker，
 * 主线程不阻塞；worker 不可用（jsdom/老浏览器）或尚未就绪时同步兜底，
 * 保证 UI 始终有值、永不空白。
 *
 * 线程安全的单例：模块内共享一个 Worker，跨 hook 实例复用。
 */

/** 超过该 K 线数才启用 worker（小窗口同步计算更快，避免 postMessage 开销） */
export const WORKER_THRESHOLD = 2000

let workerSingleton: Worker | null = null
let workerFailed = false

function getWorker(): Worker | null {
  if (workerFailed) return null
  if (workerSingleton) return workerSingleton
  try {
    if (typeof Worker === 'undefined') throw new Error('no Worker')
    const w = new Worker(new URL('../indicators/indicator.worker.ts', import.meta.url), { type: 'module' })
    // 统一响应分发：worker 结果按 id 匹配 pending resolve
    w.onmessage = (e: MessageEvent<WorkerLineResponse>) => {
      const { id } = e.data
      const resolve = pending.get(id)
      if (resolve) {
        pending.delete(id)
        resolve(e.data)
      }
    }
    workerSingleton = w
  } catch {
    workerFailed = true
    return null
  }
  return workerSingleton
}

/** 请求队列：id → resolve（worker 响应对号入座） */
const pending = new Map<number, (r: WorkerLineResponse) => void>()
let nextId = 1

/** 结果缓存：key = kind + 参数签名 + 末根 time + 长度，避免重复计算 */
const cache = new Map<string, { id: string; points: ValuePoint[] }[] | null>()
const CACHE_MAX = 60

function cacheKey(kind: string, candles: Candle[], params: IndicatorParams): string {
  const last = candles[candles.length - 1]
  const first = candles[0]
  const p = params
  const sig = [p.rsiPeriod, p.macdFast, p.macdSlow, p.macdSignal, p.kdjN, p.kdjM1, p.kdjM2, p.atrPeriod, p.mfiPeriod, p.trixPeriod, p.dpoPeriod, p.vortexPeriod, p.aoFast, p.aoSlow, p.cmfPeriod, p.donchianPeriod, p.aroonPeriod].join(',')
  return `${kind}:${candles.length}:${first?.time ?? 0}:${last?.time ?? 0}:${sig}`
}

function cachePut(key: string, value: { id: string; points: ValuePoint[] }[] | null) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value as string
    cache.delete(oldest)
  }
  cache.set(key, value)
}

/**
 * 计算副图线集：优先 worker（超阈值时），失败回退同步。
 * 返回 { fromWorker, lines }；worker 未启用时 lines 为同步结果。
 */
export async function computeSubLinesRemote(
  kind: string,
  candles: Candle[],
  params: IndicatorParams,
): Promise<{ fromWorker: boolean; lines: { id: string; points: ValuePoint[] }[] | null }> {
  const sync = () => workerSubLines(kind, candles, params)
  const key = cacheKey(kind, candles, params)
  const hit = cache.get(key)
  if (hit !== undefined) return { fromWorker: false, lines: hit }

  if (candles.length < WORKER_THRESHOLD) {
    const lines = sync()
    cachePut(key, lines)
    return { fromWorker: false, lines }
  }

  const w = getWorker()
  if (!w) {
    const lines = sync()
    cachePut(key, lines)
    return { fromWorker: false, lines }
  }

  const id = nextId++
  const resp = await new Promise<WorkerLineResponse>((resolve) => {
    pending.set(id, resolve)
    const req: WorkerLineRequest = { id, kind, candles, params }
    w.postMessage(req)
  })
  pending.delete(id)
  cachePut(key, resp.lines)
  return { fromWorker: true, lines: resp.lines }
}

export interface UseSubIndicatorWorker {
  /** 覆盖线集：worker 结果或同步结果（未就绪/不支持为 null） */
  lines: { id: string; points: ValuePoint[] }[] | null
  /** 是否真正走 worker（大数据量 + 可用） */
  fromWorker: boolean
}

/**
 * React hook：窗口数据超阈值时副图指标线交给 worker 异步计算。
 * worker 不可用/未就绪期间返回同步结果（不空白）。
 */
export function useSubIndicatorWorker(
  kind: string,
  candles: Candle[],
  params: IndicatorParams,
): UseSubIndicatorWorker {
  const [state, setState] = useState<UseSubIndicatorWorker>(() => ({
    lines: candles.length >= WORKER_THRESHOLD ? null : workerSubLines(kind, candles, params),
    fromWorker: false,
  }))
  const key = cacheKey(kind, candles, params)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    // 小窗口直接同步（不发 worker 请求）
    if (candles.length < WORKER_THRESHOLD) {
      setState({ lines: workerSubLines(kind, candles, params), fromWorker: false })
      return
    }
    let alive = true
    computeSubLinesRemote(kind, candles, params).then((r) => {
      if (!alive) return
      setState({ lines: r.lines, fromWorker: r.fromWorker })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 以缓存 key 为依赖，避免引用抖动
  }, [key, kind, candles, params])

  // 未触发 effect（首帧大窗口）时同步兜底，避免空白
  if (state.lines === null && candles.length >= WORKER_THRESHOLD) {
    return { lines: workerSubLines(kind, candles, params), fromWorker: false }
  }
  return stateRef.current
}

/** 测试辅助：重置 worker 单例与缓存 */
export function _resetWorkerClient() {
  workerSingleton = null
  workerFailed = false
  pending.clear()
  cache.clear()
}
