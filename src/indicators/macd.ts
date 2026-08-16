import type { Candle } from '../chart/types'
import { calcEMA, type ValuePoint } from './sma'

export interface MacdPoint {
  time: number
  dif: number
  dea: number
  hist: number
}

/** MACD：DIF = EMA(fast) − EMA(slow)，DEA = EMA(DIF, signal)，柱 = DIF − DEA（对齐 TradingView 口径）。 */
export function calcMACD(candles: Candle[], fast = 12, slow = 26, signal = 9): MacdPoint[] {
  const closes: ValuePoint[] = candles.map((c) => ({ time: c.time, value: c.close }))
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)

  // 以 Map 索引对齐快慢线（O(n)，避免内层线性查找的 O(n²)）
  const fastMap = new Map(emaFast.map((p) => [p.time, p.value]))
  const difMap = new Map<number, number>()
  for (const p of emaSlow) {
    const f = fastMap.get(p.time)
    if (f !== undefined) difMap.set(p.time, f - p.value)
  }
  const difPoints: ValuePoint[] = [...difMap.entries()].map(([time, value]) => ({ time, value }))

  const deaPoints = calcEMA(difPoints, signal)
  const deaMap = new Map(deaPoints.map((p) => [p.time, p.value]))

  const out: MacdPoint[] = []
  for (const p of difPoints) {
    const dea = deaMap.get(p.time)
    if (dea === undefined) continue
    out.push({ time: p.time, dif: p.value, dea, hist: p.value - dea })
  }
  return out
}
