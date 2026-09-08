import { describe, expect, it } from 'vitest'
import { atrPercent } from '../volatility'

describe('atrPercent（I6 波动率估计）', () => {
  it('空数组 → 0', () => {
    expect(atrPercent([])).toBe(0)
  })
  it('稳定蜡烛（高=低=收）→ 0 波动', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({ high: 100, low: 100, close: 100, open: 100, volume: 1, time: i, isClosed: true }))
    expect(atrPercent(candles)).toBeCloseTo(0)
  })
  it('振幅 2%（高-低=2，价 100）→ ~2%', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({ high: 102, low: 100, close: 100, open: 101, volume: 1, time: i, isClosed: true }))
    expect(atrPercent(candles)).toBeCloseTo(2)
  })
  it('取最近 period 根；不足时用全部', () => {
    const candles = Array.from({ length: 5 }, (_, i) => ({ high: 101, low: 99, close: 100, open: 100, volume: 1, time: i, isClosed: true }))
    expect(atrPercent(candles, 14)).toBeCloseTo(2)
  })
})
