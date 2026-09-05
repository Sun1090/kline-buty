import type { Candle } from '../chart/types'
import type { ValuePoint } from './sma'

export interface BollPoint {
  time: number
  upper: number
  mid: number
  lower: number
}

/** 布林带：MID = SMA(period)，上下轨 = MID ± mult × 总体标准差。 */
export function calcBOLL(candles: Candle[], period = 20, mult = 2): BollPoint[] {
  const out: BollPoint[] = []
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0
    let sumSq = 0
    for (let j = i - period + 1; j <= i; j++) {
      const c = candles[j].close
      sum += c
      sumSq += c * c
    }
    const mid = sum / period
    const variance = sumSq / period - mid * mid
    const std = Math.sqrt(Math.max(variance, 0))
    out.push({ time: candles[i].time, upper: mid + mult * std, mid, lower: mid - mult * std })
  }
  return out
}

/** 布林带点集 → 三条可渲染线（上轨/中轨/下轨，适配线条序列） */
export function bollToLines(boll: BollPoint[]) {
  return {
    upper: boll.map((p) => ({ time: p.time, value: p.upper })) satisfies ValuePoint[],
    mid: boll.map((p) => ({ time: p.time, value: p.mid })) satisfies ValuePoint[],
    lower: boll.map((p) => ({ time: p.time, value: p.lower })) satisfies ValuePoint[],
  }
}
