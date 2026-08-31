import type { Candle } from '../chart/types'
import { type ValuePoint } from './sma'

/**
 * 蔡金资金流 CMF(n)：衡量资金进出强度的量价指标。
 *
 * 每根 K 线的资金流乘数 MFM = ((C−L) − (H−C)) / (H−L)，范围 [−1, 1]；
 * 窗口内 CMF = Σ(MFM×V) / ΣV（成交额加权均值）。
 *
 * 惯例：CMF > 0 资金流入，< 0 资金流出；
 * 与价格背离时提示量价不配合（例如新高但 CMF 走弱 = 顶背离）。
 */
export function calcCMF(candles: Candle[], n = 20): ValuePoint[] {
  const out: ValuePoint[] = []
  if (candles.length === 0) return out
  let mfvSum = 0
  let volSum = 0
  const mfvWin: number[] = []
  const volWin: number[] = []
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const range = c.high - c.low
    // 高低一致时按 0 处理（无资金流方向）
    const mfm = range === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / range
    const mfv = mfm * c.volume
    mfvWin.push(mfv)
    volWin.push(c.volume)
    mfvSum += mfv
    volSum += c.volume
    if (i >= n) {
      mfvSum -= mfvWin.shift() ?? 0
      volSum -= volWin.shift() ?? 0
    }
    if (i >= n - 1) {
      out.push({ time: c.time, value: volSum === 0 ? 0 : mfvSum / volSum })
    }
  }
  return out
}