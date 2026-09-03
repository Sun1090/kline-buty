import type { Candle } from '../chart/types'
import { calcEMA, type ValuePoint } from './sma'

/**
 * TRIX（三重指数平均变化率，Triple Exponential Average）：对收盘价做三次 EMA 平滑后，
 * 取相邻两期三重均值的百分比变化率。
 *
 * 定义：EMA1 = EMA(C, n)；EMA2 = EMA(EMA1, n)；EMA3 = EMA(EMA2, n)；
 * TRIX[i] = (EMA3[i] − EMA3[i−1]) / EMA3[i−1] × 100。
 *
 * 用途：与价格/K 线异同作为动量确认，金叉（TRIX 上穿 0 或穿越其 MA）为买入信号。
 * 输出为百分比（可正可负），围绕 0 轴绘制。
 */
export function calcTRIX(candles: Candle[], n = 15): ValuePoint[] {
  const closes: ValuePoint[] = candles.map((c) => ({ time: c.time, value: c.close }))
  const e1 = calcEMA(closes, n)
  const e2 = calcEMA(e1, n)
  const e3 = calcEMA(e2, n)
  const out: ValuePoint[] = []
  for (let i = 1; i < e3.length; i++) {
    const prev = e3[i - 1].value
    if (prev === 0) continue
    out.push({ time: e3[i].time, value: ((e3[i].value - prev) / prev) * 100 })
  }
  return out
}
