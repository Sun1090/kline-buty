import { describe, expect, it } from 'vitest'
import { calcDonchian } from '../donchian'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

describe('calcDonchian', () => {
  it('空数组返回空', () => {
    expect(calcDonchian([])).toEqual([])
  })
  it('数据不足 n 根返回空', () => {
    const candles = [c(1, 10, 12, 9, 11, 100), c(2, 11, 13, 10, 12, 150)]
    expect(calcDonchian(candles, 20)).toEqual([])
  })
  it('单边上涨 → 上轨=窗口最高、下轨=窗口最低、中轨=均值', () => {
    // 窗口为 [19,20]，high 依次增加 → 上轨=最后 high，下轨=窗口起始 low
    const candles: Candle[] = []
    for (let i = 1; i <= 40; i++) candles.push(c(i, i, i + 1, i - 1, i, 100))
    const out = calcDonchian(candles, 20)
    expect(out).toHaveLength(21)
    const last = out[out.length - 1]
    // 最后输出窗口 = 蜡烛索引 [20, 39]（共 20 根）：最高 high 在 index 39 = 41
    expect(last.upper).toBe(41)
    // 最低 low 在 index 20 = c(21).low = 21−1 = 20
    expect(last.lower).toBe(20)
    expect(last.middle).toBe((41 + 20) / 2)
  })
  it('第 n-1 根即开始输出（数据量正好 = n）', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 20; i++) candles.push(c(i, i, i + 1, i - 1, i, 100))
    expect(calcDonchian(candles, 20)).toHaveLength(1)
  })
  it('窗口滑动正确（峰值滑出后上轨下降）', () => {
    // 前 5 根很高（≥100），之后回归低位：窗口滑出后上轨应跌回后续 high
    const candles: Candle[] = [
      c(1, 200, 300, 190, 200, 100),
      c(2, 200, 300, 190, 200, 100),
      c(3, 200, 300, 190, 200, 100),
      c(4, 200, 300, 190, 200, 100),
      c(5, 200, 300, 190, 200, 100),
    ]
    for (let i = 6; i <= 60; i++) candles.push(c(i, 10, 12, 8, 11, 100))
    const out = calcDonchian(candles, 20)
    // 最后输出窗口全是低位 → 上轨应为 12
    expect(out[out.length - 1].upper).toBe(12)
  })
})