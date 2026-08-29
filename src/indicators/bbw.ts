import type { Candle } from '../chart/types'
import { calcBOLL } from './boll'
import type { ValuePoint } from './sma'

/**
 * 布林带宽 BBW：%B 带宽 = (UPPER − LOWER) / MID × 100。
 * 衡量波动率扩张/收缩：数值抬升为波动放大，回落为挤压（squeeze）。
 */
export function calcBBW(candles: Candle[], period = 20, mult = 2): ValuePoint[] {
  const boll = calcBOLL(candles, period, mult)
  const out: ValuePoint[] = []
  for (const p of boll) {
    if (p.mid === 0) continue // 价格为 0 无意义（理论不出现），跳过防除零
    out.push({ time: p.time, value: ((p.upper - p.lower) / p.mid) * 100 })
  }
  return out
}
