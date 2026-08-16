import type { Candle } from '../chart/types'

export interface KdjPoint {
  time: number
  k: number
  d: number
  j: number
}

/**
 * KDJ：RSV = (C − LLV(low,n)) / (HHV(high,n) − LLV(low,n)) × 100；
 * K/D 为 m1/m2 阶 SMA 平滑（种子 50），J = 3K − 2D。
 */
export function calcKDJ(candles: Candle[], n = 9, m1 = 3, m2 = 3): KdjPoint[] {
  let k = 50
  let d = 50
  const out: KdjPoint[] = []
  for (let i = 0; i < candles.length; i++) {
    let lowMin = Infinity
    let highMax = -Infinity
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (candles[j].low < lowMin) lowMin = candles[j].low
      if (candles[j].high > highMax) highMax = candles[j].high
    }
    const rsv = highMax === lowMin ? 50 : ((candles[i].close - lowMin) / (highMax - lowMin)) * 100
    k = (k * (m1 - 1) + rsv) / m1
    d = (d * (m2 - 1) + k) / m2
    const j = 3 * k - 2 * d
    out.push({ time: candles[i].time, k, d, j })
  }
  return out
}
