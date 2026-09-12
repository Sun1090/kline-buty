import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { alignTimeToPeriod } from './align'

export interface SyntheticOptions {
  /** 起始时间（秒），默认从当前时间倒推 */
  startTime?: number
  /** 每根 K 线间隔（秒），默认 60；与 period 同时提供时由 period 推导 */
  stepSeconds?: number
  /** 周期（可选）：提供时起点对齐到该周期边界、步长 = 该周期毫秒/1000（切周期压测用） */
  period?: Period
  /** 基准价 */
  base?: number
  /** 波动幅度 */
  vol?: number
}

/**
 * 合成 K 线生成器：确定性（纯函数，同参数同输出），用于大数据量压测
 * 与离线演示（?perf=N 进入压测模式，不依赖交易所网络）。
 */
export function generateSyntheticCandles(count: number, opts: SyntheticOptions = {}): Candle[] {
  const {
    startTime = Math.floor(Date.now() / 1000),
    period,
    stepSeconds = period ? PERIOD_MS[period] / 1000 : 60,
    base = 50_000,
    vol = 5_000,
  } = opts
  // A1 时间戳对齐：提供 period 时对齐该周期边界（终点即边界），否则对齐 1m（默认步长 60s）。
  // A2 修正：从「起始时间」向历史方向生成——终点对齐周期边界、序列升序（最旧在前、最新在末尾），
  // 与真实行情一致（各周期数据终点 = now，最新一根在末尾）。此前向前生成会让不同周期
  // 的终点各不相同（now+周期跨度），导致切周期右侧锚定按时间映射时失真。
  const alignPeriod: Period = period ?? '1m'
  const end = alignTimeToPeriod(startTime, alignPeriod)
  const start = end - (count - 1) * stepSeconds
  const out: Candle[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const drift = Math.sin(i / 200) * vol + Math.sin(i / 7) * 30
    const open = base + drift
    const close = base + drift + Math.sin(i / 13) * 20
    const high = Math.max(open, close) + 50 + (i % 3) * 10
    const low = Math.min(open, close) - 50 - (i % 5) * 8
    out[i] = {
      time: start + i * stepSeconds,
      open,
      high,
      low,
      close,
      volume: 100 + (i % 97),
      isClosed: true,
    }
  }
  return out
}

/** 把合成数据的最后一根变成「未收盘跳动中」的 K 线（模拟实时帧） */
export function tickSynthetic(last: Candle, tick: number): Candle {
  const drift = Math.sin(tick / 13) * 20 + (tick % 5) * 7
  const close = last.open + drift
  return {
    ...last,
    close,
    high: Math.max(last.high, close),
    low: Math.min(last.low, close),
    volume: last.volume + 1,
    isClosed: false,
  }
}

/** 读取 URL 压测参数：?perf=N（N>0 进入合成数据压测模式），clamp 到 [1, 100000] */
export function readPerfParam(search = typeof window !== 'undefined' ? window.location.search : ''): number {
  const n = Number(new URLSearchParams(search).get('perf'))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(100_000, Math.floor(n))
}

/** 压测模式判定：?perf>0 时数据源全部走合成数据，禁止任何真实网络请求（docs 契约「不联网」） */
export function isPerfMode(search = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return readPerfParam(search) > 0
}
