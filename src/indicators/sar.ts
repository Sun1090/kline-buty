import type { Candle } from '../chart/types'

export interface SarPoint {
  time: number
  /** SAR 值（止损/反转价位） */
  value: number
  /** true = 多头趋势（SAR 在价格下方），false = 空头趋势（SAR 在价格上方） */
  bull: boolean
}

/**
 * Parabolic SAR（抛物线止损）。标准算法：
 * - 初始趋势取首根 K 线（close >= open 视为多头），SAR = 反向极值；
 * - 每根 K 线按 `SAR = SAR + AF × (EP − SAR)` 推进，EP 为当前趋势内极值；
 * - 创新极值时 AF 步进 0.02（上限 0.2），反转时 AF 重置、SAR 取上一趋势极值；
 * - 多头 clamp 到 min(low[i], low[i-1])，空头 clamp 到 max(high[i], high[i-1])。
 */
export function calcSAR(
  candles: Candle[],
  afStart = 0.02,
  afStep = 0.02,
  afMax = 0.2,
): SarPoint[] {
  if (candles.length === 0) return []
  const out: SarPoint[] = []
  let bull = candles[0].close >= candles[0].open
  let af = afStart
  let ep = bull ? candles[0].high : candles[0].low
  let sar = bull ? candles[0].low : candles[0].high
  out.push({ time: candles[0].time, value: sar, bull })

  for (let i = 1; i < candles.length; i++) {
    const { time, high, low } = candles[i]
    const prevLow = candles[i - 1].low
    const prevHigh = candles[i - 1].high

    if (bull) {
      if (low < sar) {
        // 反转 → 空头：SAR 取上一趋势极值
        bull = false
        sar = ep
        ep = low
        af = afStart
      } else if (high > ep) {
        ep = high
        af = Math.min(af + afStep, afMax)
      }
    } else {
      if (high > sar) {
        // 反转 → 多头
        bull = true
        sar = ep
        ep = high
        af = afStart
      } else if (low < ep) {
        ep = low
        af = Math.min(af + afStep, afMax)
      }
    }

    sar = sar + af * (ep - sar)
    if (bull) sar = Math.min(sar, low, prevLow)
    else sar = Math.max(sar, high, prevHigh)

    out.push({ time, value: sar, bull })
  }
  return out
}
