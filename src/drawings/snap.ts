import type { Candle } from '../chart/types'

/** C3 吸附对齐模式：off=关闭 / time=仅时间对齐 / ohlc=时间 + OHLC 价格对齐 */
export type SnapMode = 'off' | 'time' | 'ohlc'

/** 兼容旧 localStorage boolean 值（drawingSnap 曾是开关）：true→ohlc、false→off */
export function normalizeSnapMode(v: unknown): SnapMode {
  if (v === 'off' || v === 'time' || v === 'ohlc') return v
  return v === true ? 'ohlc' : 'off'
}

/**
 * 画线吸附（C3）：按模式对齐。
 * - time：时间吸附到最近 K 线开盘时刻，价格不动（轻量网格感）
 * - ohlc：时间 + 价格吸附最近 OHLC（距离阈值 = 0.75 × K 线振幅，阈值外不吸附避免拉扯）
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
