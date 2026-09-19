import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { locateRangeFor } from '../locate'

const mk = (time: number): Candle => ({ time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100, isClosed: true })

describe('locateRangeFor（v0.5.x 流水定位图表）', () => {
  it('以成交时刻所在 K 线为中心取 ±span 根范围', () => {
    const candles = Array.from({ length: 100 }, (_, i) => mk(i * 60))
    // atSec = 43m（第 43 根）→ [43-20, 43+20] = [23, 63]
    const r = locateRangeFor(candles, 43 * 60 + 30)
    expect(r).toEqual({ from: 23 * 60, to: 63 * 60 })
  })

  it('靠近开头时钳制到首根', () => {
    const candles = Array.from({ length: 30 }, (_, i) => mk(i * 60))
    const r = locateRangeFor(candles, 0)
    expect(r).toEqual({ from: 0, to: 20 * 60 })
  })

  it('靠近结尾时钳制到末根', () => {
    const candles = Array.from({ length: 30 }, (_, i) => mk(i * 60))
    const r = locateRangeFor(candles, 29 * 60)
    expect(r!.to).toBe(29 * 60)
    expect(r!.from).toBe(9 * 60)
  })

  it('空 K 线 → null', () => {
    expect(locateRangeFor([], 123)).toBeNull()
  })
})