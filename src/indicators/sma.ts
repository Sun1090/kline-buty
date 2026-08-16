import type { Candle } from '../chart/types'

export interface ValuePoint {
  time: number
  value: number
}

/** 简单移动平均（纯函数）。window 自 period-1 起有效。 */
export function calcSMA(points: ValuePoint[], period: number): ValuePoint[] {
  const out: ValuePoint[] = []
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    sum += points[i].value
    if (i >= period) sum -= points[i - period].value
    if (i >= period - 1) out.push({ time: points[i].time, value: sum / period })
  }
  return out
}

export function calcMA(candles: Candle[], period: number): ValuePoint[] {
  return calcSMA(
    candles.map((c) => ({ time: c.time, value: c.close })),
    period,
  )
}

/** 指数移动平均。以 SMA 为种子（与 TradingView RMA 种子趋势一致）。 */
export function calcEMA(points: ValuePoint[], period: number): ValuePoint[] {
  const k = 2 / (period + 1)
  const out: ValuePoint[] = []
  let prev = 0
  for (let i = 0; i < points.length; i++) {
    const v = points[i].value
    if (i < period - 1) continue
    if (i === period - 1) {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += points[j].value
      prev = sum / period
    } else {
      prev = v * k + prev * (1 - k)
    }
    out.push({ time: points[i].time, value: prev })
  }
  return out
}
