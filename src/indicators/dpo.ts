import type { Candle } from '../chart/types'
import { calcSMA, type ValuePoint } from './sma'

/**
 * DPO（去势价格振荡，Detrended Price Oscillator）：用滞后 n/2+1 根的 SMA 作为趋势基准，
 * DPO[i] = Close[i] − SMA(Close, n)[i − (n/2+1)]。消除长期趋势，凸显摆动周期。
 *
 * TradingView 口径：SMA 应用在收盘价序列，输出右移（当前收盘减去 n/2+1 根前的均线）。
 * 正值表示价格高于去势基准（短期动量偏强），负值反之。
 */
export function calcDPO(candles: Candle[], n = 20): ValuePoint[] {
  if (candles.length === 0) return []
  const closes: ValuePoint[] = candles.map((c) => ({ time: c.time, value: c.close }))
  const sma = calcSMA(closes, n)
  if (sma.length === 0) return []
  // DPO[i] = Close[i] − SMA(滞后 offset=n/2+1 根)。
  // sma[j] 对应 closes[j + n − 1]；要取「落在 closes[i − offset]」的均线 → j = i − offset − (n−1)。
  const offset = Math.floor(n / 2) + 1
  const out: ValuePoint[] = []
  for (let i = offset + n - 1; i < candles.length; i++) {
    const j = i - offset - (n - 1)
    if (j < 0 || j >= sma.length) continue
    out.push({ time: candles[i].time, value: candles[i].close - sma[j].value })
  }
  return out
}
