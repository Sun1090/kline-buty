import type { Candle } from '../chart/types'

export interface SyntheticOptions {
  /** 起始时间（秒），默认从当前时间倒推 */
  startTime?: number
  /** 每根 K 线间隔（秒），默认 60 */
  stepSeconds?: number
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
  const { startTime = Math.floor(Date.now() / 1000), stepSeconds = 60, base = 50_000, vol = 5_000 } = opts
  const out: Candle[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const drift = Math.sin(i / 200) * vol + Math.sin(i / 7) * 30
    const open = base + drift
    const close = base + drift + Math.sin(i / 13) * 20
    const high = Math.max(open, close) + 50 + (i % 3) * 10
    const low = Math.min(open, close) - 50 - (i % 5) * 8
    out[i] = {
      time: startTime + i * stepSeconds,
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
