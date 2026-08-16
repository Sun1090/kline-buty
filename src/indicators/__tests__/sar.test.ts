import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { calcSAR } from '../sar'

function c(time: number, o: number, h: number, l: number, cl: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: 1, isClosed: true }
}

/** 手算用例：前 5 根单边上行 → 第 6 根破位反转 → 空头 → 第 9 根拉回反转多头 */
const candles: Candle[] = [
  c(0, 10, 12, 9, 11),
  c(1, 11, 13, 10, 12),
  c(2, 12, 14, 11, 13),
  c(3, 13, 15, 12, 14),
  c(4, 14, 16, 13, 15),
  c(5, 15, 16, 8, 9),
  c(6, 9, 11, 7, 8),
  c(7, 8, 10, 6, 7),
  c(8, 7, 17, 6, 16),
  c(9, 16, 18, 15, 17),
]

describe('calcSAR', () => {
  it('初始多头：SAR = 首根最低价，ep = 首根最高价', () => {
    const out = calcSAR(candles)
    expect(out[0]).toEqual({ time: 0, value: 9, bull: true })
  })

  it('上行中每根按 AF×（EP−SAR）推进且 clamp 到前两根低点', () => {
    const out = calcSAR(candles)
    expect(out[1].value).toBeCloseTo(9, 6) // clamp 到 low[0]=9
    expect(out[2].value).toBeCloseTo(9.3, 6)
    expect(out[3].value).toBeCloseTo(9.756, 6)
    expect(out[4].value).toBeCloseTo(10.3804, 6)
    for (let i = 1; i <= 4; i++) expect(out[i].bull).toBe(true)
  })

  it('跌破 SAR → 反转空头：SAR 取上趋势极值，AF 重置', () => {
    const out = calcSAR(candles)
    expect(out[5].bull).toBe(false)
    expect(out[5].value).toBeCloseTo(16, 6) // 上趋势 EP=16，clamp 到 high
  })

  it('空头继续：SAR 上行，AF 递增', () => {
    const out = calcSAR(candles)
    expect(out[6].bull).toBe(false)
    expect(out[6].value).toBeCloseTo(16, 6) // clamp 到 high[5]=16
    expect(out[7].value).toBeCloseTo(15.4, 6)
  })

  it('突破 SAR → 反转多头', () => {
    const out = calcSAR(candles)
    expect(out[8].bull).toBe(true)
    expect(out[8].value).toBeCloseTo(6, 6)
    expect(out[9].value).toBeCloseTo(6, 6)
  })

  it('空数组返回空', () => {
    expect(calcSAR([])).toEqual([])
  })

  it('AF 上限 0.2 生效', () => {
    // 长时间单边上涨：每根都创新高 → AF 封顶 0.2
    const up = Array.from({ length: 30 }, (_, i) => c(i, i, i + 2, i, i + 1))
    const out = calcSAR(up)
    expect(out[out.length - 1].bull).toBe(true)
    // 手工推导：i 处 sar = sar_prev + min(0.02*(i+1), 0.2)*(i+2 - sar_prev)
    let sar = 0 // low[0]
    let ep: number
    let af = 0.02
    for (let i = 1; i < 30; i++) {
      ep = i + 2 // high[i]，每根创新高 → AF 递增
      af = Math.min(af + 0.02, 0.2)
      sar = sar + af * (ep - sar)
      sar = Math.min(sar, i, i - 1)
      expect(out[i].value).toBeCloseTo(sar, 6)
    }
  })
})
