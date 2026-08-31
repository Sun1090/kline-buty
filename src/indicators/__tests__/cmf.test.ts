import { describe, expect, it } from 'vitest'
import { calcCMF } from '../cmf'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

describe('calcCMF', () => {
  it('空数组返回空', () => {
    expect(calcCMF([])).toEqual([])
  })
  it('数据不足 n 根返回空', () => {
    const candles = [c(1, 10, 12, 9, 11, 100), c(2, 11, 13, 10, 12, 150)]
    expect(calcCMF(candles, 20)).toEqual([])
  })
  it('收盘位于区间中点 → CMF=0', () => {
    // 每根 high/low 对称，close 恰为 (H+L)/2 → MFM=0
    const candles: Candle[] = []
    for (let i = 1; i <= 30; i++) candles.push(c(i, 10, 12, 8, 10, 100))
    const out = calcCMF(candles, 20)
    expect(out).toHaveLength(11)
    for (const p of out) expect(p.value).toBeCloseTo(0)
  })
  it('收盘贴近最高 → 资金流入为正 CMF', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 30; i++) candles.push(c(i, 10, 12, 8, 11.9, 100))
    for (const p of calcCMF(candles, 20)) expect(p.value).toBeGreaterThan(0)
  })
  it('收盘贴近最低 → CMF 为负', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 30; i++) candles.push(c(i, 10, 12, 8, 8.1, 100))
    for (const p of calcCMF(candles, 20)) expect(p.value).toBeLessThan(0)
  })
  it('高低相等时不产生 NaN（MFM=0）', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 30; i++) candles.push(c(i, 10, 10, 10, 10, 100))
    for (const p of calcCMF(candles, 20)) expect(Number.isFinite(p.value)).toBe(true)
  })
})