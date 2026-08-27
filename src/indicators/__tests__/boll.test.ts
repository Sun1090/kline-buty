import { describe, expect, it } from 'vitest'
import { calcBOLL, bollToLines } from '../boll'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close, high: close, low: close, close, volume: 0, isClosed: true }
}

describe('calcBOLL', () => {
  it('MID = SMA(period)，上轨高/下轨低', () => {
    const candles = [c(1, 10), c(2, 20), c(3, 30)]
    const out = calcBOLL(candles, 3)
    expect(out).toHaveLength(1)
    expect(out[0].mid).toBeCloseTo(20) // (10+20+30)/3
    expect(out[0].upper).toBeGreaterThan(out[0].mid)
    expect(out[0].lower).toBeLessThan(out[0].mid)
  })

  it('上下轨关于 MID 对称（mult × std）', () => {
    const candles = [c(1, 10), c(2, 20), c(3, 30)]
    const out = calcBOLL(candles, 3, 2)
    expect(out[0].upper - out[0].mid).toBeCloseTo(out[0].mid - out[0].lower)
  })

  it('无波动（全部相同 close）→ 上下轨 = MID（std=0）', () => {
    const candles = [c(1, 50), c(2, 50), c(3, 50)]
    const out = calcBOLL(candles, 3)
    expect(out[0].upper).toBeCloseTo(50)
    expect(out[0].mid).toBeCloseTo(50)
    expect(out[0].lower).toBeCloseTo(50)
  })

  it('mult 倍数影响带宽', () => {
    const candles = [c(1, 10), c(2, 20), c(3, 30)]
    const m1 = calcBOLL(candles, 3, 1)
    const m2 = calcBOLL(candles, 3, 2)
    expect(m2[0].upper - m2[0].mid).toBeCloseTo(2 * (m1[0].upper - m1[0].mid))
  })

  it('period 前不产出', () => {
    const candles = [c(1, 10), c(2, 20)]
    expect(calcBOLL(candles, 5)).toEqual([])
  })

  it('空数组 → 空结果', () => {
    expect(calcBOLL([], 20)).toEqual([])
  })

  it('默认 period=20 / mult=2', () => {
    const candles = Array.from({ length: 25 }, (_, i) => c(i + 1, 100))
    const out = calcBOLL(candles)
    // i=19..24 产出 → 6 个
    expect(out).toHaveLength(6)
  })

  it('time 透传', () => {
    const candles = [c(100, 10), c(200, 20), c(300, 30)]
    const out = calcBOLL(candles, 3)
    expect(out[0].time).toBe(300)
  })
})

describe('bollToLines', () => {
  it('BollPoint[] → 三条 ValuePoint[]（upper/mid/lower）', () => {
    const boll = [
      { time: 1, upper: 30, mid: 20, lower: 10 },
      { time: 2, upper: 33, mid: 22, lower: 11 },
    ]
    const lines = bollToLines(boll)
    expect(lines.upper).toHaveLength(2)
    expect(lines.mid).toHaveLength(2)
    expect(lines.lower).toHaveLength(2)
    expect(lines.upper[0].value).toBe(30)
    expect(lines.mid[1].value).toBe(22)
    expect(lines.lower[0].value).toBe(10)
  })

  it('空输入 → 三条空数组', () => {
    const lines = bollToLines([])
    expect(lines.upper).toEqual([])
    expect(lines.mid).toEqual([])
    expect(lines.lower).toEqual([])
  })
})
