import type { Candle } from '../chart/types'
import { type ValuePoint } from './sma'

/**
 * 资金流量指标 MFI(n)：结合价格与成交量的相对强弱指标。
 *
 * 公式：典型价格 TP=(H+L+C)/3；原始资金流 rawMF=TP×Volume；
 * 正资金流(TP 上涨)/负资金流(TP 下跌)分别累加 n 期；
 * 资金流量比率 MFR = 正流和 / 负流和；MFI = 100 − 100/(1+MFR)。
 *
 * 惯例：MFI > 80 超买（顶背离警惕），< 20 超卖；与 RSI 同理但纳入成交额，
 * 用于判断价格上行动量是否获得资金认可（量价背离）。
 */
export function calcMFI(candles: Candle[], n = 14): ValuePoint[] {
  const out: ValuePoint[] = []
  if (candles.length === 0) return out
  // 逐根累计正/负资金流（滚动窗口，O(n)）
  let posSum = 0
  let negSum = 0
  const posWin: number[] = []
  const negWin: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const tp = (c.high + c.low + c.close) / 3
    const prevTp = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3
    const mf = tp * c.volume
    posWin.push(tp >= prevTp ? mf : 0)
    negWin.push(tp < prevTp ? mf : 0)
    posSum += posWin[posWin.length - 1]
    negSum += negWin[negWin.length - 1]
    if (i > n) {
      posSum -= posWin.shift() ?? 0
      negSum -= negWin.shift() ?? 0
    }
    if (i >= n) {
      const mfr = negSum === 0 ? (posSum === 0 ? 0 : Infinity) : posSum / negSum
      const value = mfr === Infinity ? 100 : 100 - 100 / (1 + mfr)
      out.push({ time: c.time, value })
    }
  }
  return out
}