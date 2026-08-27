import { describe, expect, it } from 'vitest'
import { calcKDJ } from '../kdj'
import type { Candle } from '../../chart/types'

function c(time: number, close: number, high = close, low = close): Candle {
  return { time, open: close, high, low, close, volume: 0, isClosed: true }
}

describe('calcKDJ', () => {
  it('持续上涨 → K > D（K 更敏感领涨）', () => {
    const candles = Array.from({ length: 15 }, (_, i) => c(i + 1, 100 + i, 100 + i + 1, 100 + i - 1))
    const out = calcKDJ(candles)
    const last = out[out.length - 1]
    expect(last.k).toBeGreaterThan(last.d)
  })

  it('持续下跌 → K < D', () => {
    const candles = Array.from({ length: 15 }, (_, i) => c(i + 1, 200 - i, 200 - i + 1, 200 - i - 1))
    const out = calcKDJ(candles)
    const last = out[out.length - 1]
    expect(last.k).toBeLessThan(last.d)
  })

  it('J = 3K − 2D 公式对齐', () => {
    const candles = Array.from({ length: 15 }, (_, i) =>
      c(i + 1, 100 + Math.sin(i * 0.5) * 10, 110, 90),
    )
    const out = calcKDJ(candles)
    for (const p of out) {
      expect(p.j).toBeCloseTo(3 * p.k - 2 * p.d, 6)
    }
  })

  it('超买：持续大涨 → K 趋近 100', () => {
    const candles = Array.from({ length: 20 }, (_, i) => c(i + 1, 100 + i * 2, 100 + i * 2 + 1, 100 + i * 2 - 1))
    const out = calcKDJ(candles)
    const last = out[out.length - 1]
    expect(last.k).toBeGreaterThan(80)
  })

  it('超卖：持续大跌 → K 趋近 0', () => {
    const candles = Array.from({ length: 20 }, (_, i) => c(i + 1, 300 - i * 2, 300 - i * 2 + 1, 300 - i * 2 - 1))
    const out = calcKDJ(candles)
    const last = out[out.length - 1]
    expect(last.k).toBeLessThan(20)
  })

  it('无波动（高低收相同）→ RSV=50 分支，K/D 从 50 平滑偏移', () => {
    const candles = [c(1, 50, 50, 50), c(2, 50, 50, 50), c(3, 50, 50, 50)]
    const out = calcKDJ(candles)
    // highMax === lowMin → rsv = 50；k 从 50 平滑不变
    expect(out[0].k).toBeCloseTo(50)
    expect(out[1].k).toBeCloseTo(50)
  })

  it('默认 n=9/m1=3/m2=3，种子 K=D=50', () => {
    // 高低收不同 → 有波动 → K 从种子 50 偏移
    const candles = Array.from({ length: 12 }, (_, i) => c(i + 1, 100 + i, 100 + i + 2, 100 + i - 1))
    const out = calcKDJ(candles)
    expect(out).toHaveLength(12)
    expect(out[0].k).not.toBe(50) // 有波动，K 从 50 偏移
  })

  it('空数组 → 空结果', () => {
    expect(calcKDJ([])).toEqual([])
  })

  it('time 透传', () => {
    const candles = [c(100, 10, 11, 9), c(200, 12, 13, 11)]
    const out = calcKDJ(candles)
    expect(out[0].time).toBe(100)
    expect(out[1].time).toBe(200)
  })
})
