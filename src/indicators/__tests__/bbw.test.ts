import { describe, expect, it } from 'vitest'
import { calcBBW } from '../bbw'
import { calcBOLL } from '../boll'
import type { Candle } from '../../chart/types'

function mkCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({ time: i + 1, open: close, high: close, low: close, close, volume: 1, isClosed: true }))
}

describe('calcBBW（布林带宽）', () => {
  it('数值 = (upper − lower) / mid × 100（与 calcBOLL 同参一致）', () => {
    const candles = mkCandles([10, 11, 12, 13, 12, 11, 10, 9, 10, 11, 12, 13, 14, 13, 12, 11, 10, 11, 12, 13])
    const bw = calcBBW(candles, 20, 2)
    const boll = calcBOLL(candles, 20, 2)
    expect(bw).toHaveLength(boll.length)
    expect(bw[0].time).toBe(boll[0].time)
    const expected = ((boll[0].upper - boll[0].lower) / boll[0].mid) * 100
    expect(bw[0].value).toBeCloseTo(expected, 10)
  })

  it('数据不足 period 时返回空数组', () => {
    expect(calcBBW(mkCandles([10, 11, 12]), 20, 2)).toEqual([])
  })

  it('恒定价格带宽为 0（标准差为 0）', () => {
    const bw = calcBBW(mkCandles(Array(25).fill(100)), 20, 2)
    expect(bw).toHaveLength(6)
    expect(bw.every((p) => p.value === 0)).toBe(true)
  })

  it('波动放大时带宽增大', () => {
    const calm = calcBBW(mkCandles(Array(25).fill(100).map((v, i) => v + (i % 2 === 0 ? 0.1 : -0.1))), 20, 2)
    const wild = calcBBW(mkCandles(Array(25).fill(100).map((v, i) => v + (i % 2 === 0 ? 10 : -10))), 20, 2)
    expect(wild[wild.length - 1].value).toBeGreaterThan(calm[calm.length - 1].value)
  })
})
