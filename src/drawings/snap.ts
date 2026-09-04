import type { Candle } from '../chart/types'

/** C3 吸附对齐模式：off=关闭 / time=仅时间对齐 / ohlc=时间 + OHLC 价格对齐 / grid=时间 + 网格步长价格对齐（I4） */
export type SnapMode = 'off' | 'time' | 'ohlc' | 'grid'

/** 兼容旧 localStorage boolean 值（drawingSnap 曾是开关）：true→ohlc、false→off */
export function normalizeSnapMode(v: unknown): SnapMode {
  if (v === 'off' || v === 'time' || v === 'ohlc' || v === 'grid') return v
  return v === true ? 'ohlc' : 'off'
}

/** I4 网格步长：按价格量级自适应（整数/半分位刻度网格） */
export function gridStep(price: number): number {
  const a = Math.abs(price)
  if (a < 1) return 0.01
  if (a < 100) return 0.1
  if (a < 1000) return 1
  return 10
}

/** I4 网格对齐：把价格吸附到 step 整数倍（避免浮点尾差） */
export function snapToGrid(price: number, step: number): number {
  const n = Math.round(price / step)
  const scaled = n * step
  // 0.1 之类步长用 10 的幂做浮点清洗，消除 104.70000000000001
  const prec = Math.max(0, Math.round(-Math.log10(step)) )
  return Number(scaled.toFixed(prec))
}

/**
 * 画线吸附（C3/I4）：按模式对齐。
 * - time：时间吸附到最近 K 线开盘时刻，价格不动（轻量网格感）
 * - ohlc：时间 + 价格吸附最近 OHLC（距离阈值 = 0.75 × K 线振幅，阈值外不吸附避免拉扯）
 * - grid：时间吸附最近 K 线开盘时刻 + 价格吸附网格步长（对齐整数/半分位刻度）
 * - off：原样返回
 */
export function snapToCandle(time: number, price: number, candles: Candle[], mode: SnapMode = 'ohlc'): { time: number; price: number } {
  if (candles.length === 0 || mode === 'off') return { time, price }
  // 二分找最近的开盘时刻
  let lo = 0
  let hi = candles.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (candles[mid].time < time) lo = mid + 1
    else hi = mid
  }
  let idx = lo
  if (idx > 0 && Math.abs(candles[idx - 1].time - time) < Math.abs(candles[idx].time - time)) idx--
  const c = candles[idx]
  if (mode === 'time') return { time: c.time, price }
  if (mode === 'grid') {
    const step = gridStep(price)
    return { time: c.time, price: snapToGrid(price, step) }
  }
  const threshold = (c.high - c.low) * 0.75
  let best = price
  let bestDist = Infinity
  for (const v of [c.open, c.high, c.low, c.close]) {
    const d = Math.abs(v - price)
    if (d < bestDist) {
      bestDist = d
      best = v
    }
  }
  return bestDist <= threshold ? { time: c.time, price: best } : { time: c.time, price }
}
