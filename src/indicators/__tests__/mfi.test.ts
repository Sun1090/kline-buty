import { describe, expect, it } from 'vitest'
import { calcMFI } from '../mfi'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

describe('calcMFI', () => {
  it('空数组返回空', () => {
    expect(calcMFI([])).toEqual([])
  })
  it('数据不足 n 根返回空', () => {
    const candles = [c(1, 10, 12, 9, 11, 100), c(2, 11, 13, 10, 12, 150)]
    expect(calcMFI(candles, 14)).toEqual([])
  })
  it('全程上涨 → MFI 趋近 100', () => {
    // 每根 TP 均上行，负流恒 0 → MFI = 100
    const candles: Candle[] = []
    for (let i = 1; i <= 20; i++) {
      candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    }
    const out = calcMFI(candles, 14)
    expect(out).toHaveLength(candles.length - 14)
    for (const p of out) expect(p.value).toBe(100)
  })
  it('负流为 0 时 MFI=100（不产生 NaN）', () => {
    const candles: Candle[] = [c(1, 10, 12, 9, 11, 100)]
    for (let i = 2; i <= 20; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    for (const p of calcMFI(candles, 14)) expect(Number.isFinite(p.value)).toBe(true)
  })
  it('量价反向（价跌但量大）→ MFI 低于 50', () => {
    // 构造 V 型：先跌后升，下跌段放量
    const candles: Candle[] = []
    for (let i = 0; i < 10; i++) candles.push(c(i, 50 - i, 51 - i, 49 - i, 50 - i, 300))
    for (let i = 0; i < 10; i++) candles.push(c(10 + i, 40 + i, 41 + i, 39 + i, 40 + i, 100))
    const out = calcMFI(candles, 14)
    const last = out[out.length - 1].value
    expect(last).toBeLessThan(50)
  })
  it('MFI 范围恒在 [0, 100]', () => {
    // 随机波动序列,不产生越界
    const candles: Candle[] = []
    let prev = 100
    for (let i = 1; i <= 40; i++) {
      const close = prev + Math.sin(i) * 3
      candles.push(c(i, prev, Math.max(prev, close) + 1, Math.min(prev, close) - 1, close, 100 + i))
      prev = close
    }
    for (const p of calcMFI(candles, 14)) {
      expect(p.value).toBeGreaterThanOrEqual(0)
      expect(p.value).toBeLessThanOrEqual(100)
    }
  })
})