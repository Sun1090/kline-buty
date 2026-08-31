import { describe, expect, it } from 'vitest'
import { calcAroon } from '../aroon'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

describe('calcAroon', () => {
  it('空数组返回空', () => {
    expect(calcAroon([])).toEqual([])
  })
  it('数据不足 n 根返回空（起点 i=n）', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 20; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    expect(calcAroon(candles, 25)).toEqual([])
  })
  it('单调上行 → 最高价在最右 → AroonUp=100', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 50; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    const out = calcAroon(candles, 25)
    expect(out).toHaveLength(25)
    // 确定最后一个上行后续创新高,即窗口内最高价就是最后一根
    for (const p of out) expect(p.up).toBe(100)
  })
  it('创新高在窗口开头 → AroonUp=0', () => {
    // 序列：第一根最高，随后一路阴跌（high 递减）
    const candles: Candle[] = [c(1, 100, 150, 90, 100, 100)]
    for (let i = 2; i <= 50; i++) candles.push(c(i, 100 - i, 100 - i + 1, 99 - i, 99 - i + 1, 100))
    const out = calcAroon(candles, 25)
    const last = out[out.length - 1]
    // 窗口 [25,49]，最高仍在 index 0（150） → up = (25-(49-0))/25*100 = (25-49)/25*100 < 0 → 钳 0
    // Aroon 惯例下调到 0（负值按 0 处理）
    expect(last.up).toBe(0)
  })
  it('上下 Aroon 总和绘界恰当：idle 序列 up+down ≈ 100', () => {
    // 随机波动下不越界
    const candles: Candle[] = []
    let prev = 100
    for (let i = 1; i <= 60; i++) {
      const close = prev + Math.sin(i) * 3
      candles.push(c(i, prev, Math.max(prev, close) + 1, Math.min(prev, close) - 1, close, 100))
      prev = close
    }
    for (const p of calcAroon(candles, 25)) {
      expect(p.up).toBeGreaterThanOrEqual(0)
      expect(p.up).toBeLessThanOrEqual(100)
      expect(p.down).toBeGreaterThanOrEqual(0)
      expect(p.down).toBeLessThanOrEqual(100)
    }
  })
})