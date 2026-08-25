import { describe, expect, it } from 'vitest'
import { calcRSI } from '../rsi'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close, high: close, low: close, close, volume: 0, isClosed: true }
}

describe('calcRSI', () => {
  it('全涨序列 → RSI=100（avgLoss=0 分支）', () => {
    const candles = [c(1, 1), c(2, 2), c(3, 3), c(4, 4), c(5, 5)]
    const out = calcRSI(candles, 3)
    expect(out).toHaveLength(2) // i=3,4 产出
    expect(out[0].value).toBe(100)
    expect(out[1].value).toBe(100)
  })

  it('全跌序列 → RSI=0', () => {
    const candles = [c(1, 5), c(2, 4), c(3, 3), c(4, 2), c(5, 1)]
    const out = calcRSI(candles, 3)
    expect(out[0].value).toBe(0)
    expect(out[1].value).toBe(0)
  })

  it('涨跌均衡 → RSI 落入中性区 40-60（Wilder 平滑不精确等于 50）', () => {
    // 涨1跌1交替，长期 avgGain≈avgLoss → RSI 接近 50
    const vals: number[] = []
    for (let k = 0; k < 60; k++) vals.push(10 + (k % 2 === 0 ? 1 : -1) + k * 0)
    const candles = vals.map((v, i) => c(i + 1, v))
    const out = calcRSI(candles, 14)
    const last = out[out.length - 1].value
    expect(last).toBeGreaterThan(40)
    expect(last).toBeLessThan(60)
  })

  it('period 前的点不产出（i < period 跳过）', () => {
    const candles = [c(1, 1), c(2, 2), c(3, 3), c(4, 4), c(5, 5)]
    const out = calcRSI(candles, 4)
    // i=1,2,3 < 4 → 跳过；i=4 产出
    expect(out).toHaveLength(1)
  })

  it('Wilder 平滑：首点用 SMA = 累加和/period', () => {
    // period=3: i=1,2 累加；i=3 首产出
    const candles = [c(1, 10), c(2, 13), c(3, 12), c(4, 15)]
    const out = calcRSI(candles, 3)
    // i=1: gain=3,loss=0; i=2: gain=0,loss=1 → 累加 avgGain=3, avgLoss=1
    // i=3: avgGain/=3 → 1, avgLoss/=3 → 0.333
    // RSI = 100 - 100/(1 + 1/0.333) = 100 - 100/4 = 75
    expect(out[0].value).toBeCloseTo(75, 1)
  })

  it('空数组 / 单根 → 空结果', () => {
    expect(calcRSI([], 14)).toEqual([])
    expect(calcRSI([c(1, 1)], 14)).toEqual([])
  })

  it('默认 period=14', () => {
    const candles = Array.from({ length: 20 }, (_, i) => c(i + 1, 100 + i))
    const out = calcRSI(candles)
    // i=1..13 累加跳过；i=14..19 产出 → 6 个
    expect(out).toHaveLength(6)
  })

  it('time 字段透传', () => {
    const candles = [c(100, 1), c(200, 2), c(300, 3), c(400, 4)]
    const out = calcRSI(candles, 3)
    expect(out[0].time).toBe(400)
  })
})
