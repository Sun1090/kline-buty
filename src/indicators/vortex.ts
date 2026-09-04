import type { Candle } from '../chart/types'
import { calcTR } from './extras'
import type { ValuePoint } from './sma'

/**
 * 涡旋指标 Vortex（VI±，n）：衡量趋势方向的动量指标。
 *
 * 定义（Ehlers）：
 * - TR = 真实波幅（max(H−L, |H−prevC|, |L−prevC|)）
 * - VMP = |H_current − L_previous|；VMM = |L_current − H_previous|
 * - VI+ = Σ(VMP, n) / Σ(TR, n)；VI− = Σ(VMM, n) / Σ(TR, n)
 *
 * 惯例：VI+ > VI− 偏多趋势；VI− > VI+ 偏空趋势；两线交叉为趋势切换信号。
 */
export function calcVortex(candles: Candle[], n = 14): { plus: ValuePoint[]; minus: ValuePoint[] } {
  const trs = calcTR(candles)
  const plus: ValuePoint[] = []
  const minus: ValuePoint[] = []
  if (candles.length < n + 1) return { plus, minus }
  let sumTr = 0
  let sumVmp = 0
  let sumVmm = 0
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prev = candles[i - 1]
    const vmp = Math.abs(c.high - prev.low)
    const vmm = Math.abs(c.low - prev.high)
    sumTr += trs[i]
    sumVmp += vmp
    sumVmm += vmm
    if (i > n) {
      sumTr -= trs[i - n]
      sumVmp -= Math.abs(candles[i - n].high - candles[i - n - 1].low)
      sumVmm -= Math.abs(candles[i - n].low - candles[i - n - 1].high)
    }
    if (i >= n) {
      plus.push({ time: c.time, value: sumTr === 0 ? 0 : sumVmp / sumTr })
      minus.push({ time: c.time, value: sumTr === 0 ? 0 : sumVmm / sumTr })
    }
  }
  return { plus, minus }
}
