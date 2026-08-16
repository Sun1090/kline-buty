import type { Candle } from '../chart/types'
import type { ValuePoint } from './sma'

/** RSI（Wilder 平滑）：RSI = 100 − 100 / (1 + avgGain / avgLoss)，全涨 → 100。 */
export function calcRSI(candles: Candle[], period = 14): ValuePoint[] {
  const out: ValuePoint[] = []
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i < candles.length; i++) {
    const ch = candles[i].close - candles[i - 1].close
    const gain = Math.max(ch, 0)
    const loss = Math.max(-ch, 0)
    if (i < period) {
      avgGain += gain
      avgLoss += loss
      continue
    }
    if (i === period) {
      avgGain /= period
      avgLoss /= period
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    out.push({ time: candles[i].time, value: rsi })
  }
  return out
}
