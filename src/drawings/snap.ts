import type { Candle } from '../chart/types'

/**
 * 画线吸附：时间吸附到最近 K 线开盘时刻；价格吸附该 K 线最近 OHLC，
 * 距离阈值 = 0.75 × K 线振幅（阈值外不吸附价格，避免远离 K 线的锚点被拉扯）。
 */
export function snapToCandle(time: number, price: number, candles: Candle[]): { time: number; price: number } {
  if (candles.length === 0) return { time, price }
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
