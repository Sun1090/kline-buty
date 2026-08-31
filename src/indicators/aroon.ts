import type { Candle } from '../chart/types'

export interface AroonPoint {
  time: number
  up: number
  down: number
}

/**
 * 阿隆指标（Aroon, n）：衡量趋势方向与强度的指标。
 *
 * AroonUp = ((n − 距最高价天数) / n) × 100
 * AroonDown = ((n − 距最低价天数) / n) × 100
 *
 * 值越接近 100 表示该方向创出近期新高/新低的「新鲜度」越高；
 * 上行至上轨（70 上方）为上升趋势，下行至下轨（30 下方）为下降趋势。
 */
export function calcAroon(candles: Candle[], n = 25): AroonPoint[] {
  const out: AroonPoint[] = []
  if (candles.length === 0) return out
  for (let i = n; i < candles.length; i++) {
    const begin = i - n
    let hhIdx = begin
    let llIdx = begin
    let hh = -Infinity
    let ll = Infinity
    for (let j = begin; j <= i; j++) {
      if (candles[j].high >= hh) {
        hh = candles[j].high
        hhIdx = j
      }
      if (candles[j].low <= ll) {
        ll = candles[j].low
        llIdx = j
      }
    }
    out.push({
      time: candles[i].time,
      up: ((n - (i - hhIdx)) / n) * 100,
      down: ((n - (i - llIdx)) / n) * 100,
    })
  }
  return out
}