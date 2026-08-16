import type { Candle } from '../chart/types'
import type { ValuePoint } from './sma'

/**
 * 成交量加权平均价（VWAP）：按日（UTC）重置，
 * 当日累计 (典型价×量) / 累计量，典型价 = (H+L+C)/3。
 */
export function calcVWAP(candles: Candle[]): ValuePoint[] {
  const out: ValuePoint[] = []
  let cumPV = 0
  let cumV = 0
  let curDay = -1
  for (const c of candles) {
    const day = Math.floor(c.time / 86_400)
    if (day !== curDay) {
      curDay = day
      cumPV = 0
      cumV = 0
    }
    const typical = (c.high + c.low + c.close) / 3
    cumPV += typical * c.volume
    cumV += c.volume
    if (cumV > 0) out.push({ time: c.time, value: cumPV / cumV })
  }
  return out
}
