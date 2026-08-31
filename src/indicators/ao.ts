import type { Candle } from '../chart/types'
import { type ValuePoint } from './sma'

/** 中位价 MP = (H+L)/2 */
function mp(c: Candle): number {
  return (c.high + c.low) / 2
}

/**
 * 动量振荡器 AO（Awesome Oscillator）：5 期 SMA(中位价) − 34 期 SMA(中位价)。
 *
 * 正值为短期动量强于中期（多头占优），负值相反。
 * 默认绘制成围绕零轴的柱状（上涨段用涨色、下跌段用跌色），
 * 并常搭配「零轴穿越」与「双峰/双谷」交易形态（Bill Williams 方法）。
 */
export function calcAO(candles: Candle[], fast = 5, slow = 34): ValuePoint[] {
  const out: ValuePoint[] = []
  const mids = candles.map(mp)
  let fastSum = 0
  let slowSum = 0
  for (let i = 0; i < mids.length; i++) {
    fastSum += mids[i]
    slowSum += mids[i]
    if (i >= fast) fastSum -= mids[i - fast]
    if (i >= slow) slowSum -= mids[i - slow]
    if (i >= slow - 1) {
      out.push({ time: candles[i].time, value: fastSum / fast - slowSum / slow })
    }
  }
  return out
}