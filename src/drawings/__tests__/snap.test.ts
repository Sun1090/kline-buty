import { describe, expect, it } from 'vitest'
import { normalizeSnapMode, snapToCandle, type SnapMode } from '../snap'
import type { Candle } from '../../chart/types'

function c(time: number, open: number, high: number, low: number, close: number): Candle {
  return { time, open, high, low, close, volume: 100, isClosed: true }
}

const candles: Candle[] = [
  c(100, 10, 12, 9, 11),
  c(200, 11, 14, 10, 13), // 振幅 4
  c(300, 13, 15, 12, 14),
]

describe('snapToCandle（C3 吸附三态）', () => {
  it('off：原样返回，不改动时间/价格', () => {
    expect(snapToCandle(150, 11.5, candles, 'off')).toEqual({ time: 150, price: 11.5 })
  })

  it('time：时间对齐最近开盘，价格不动', () => {
    const r = snapToCandle(151, 11.5, candles, 'time')
    expect(r.time).toBe(200)
    expect(r.price).toBe(11.5)
  })

  it('ohlc：时间 + 价格同时吸附最近 OHLC', () => {
    const r = snapToCandle(151, 11.1, candles, 'ohlc')
    expect(r.time).toBe(200)
    expect(r.price).toBe(11) // 11.1 距 open 11 最近（阈值=振幅×0.75=3）
  })

  it('默认模式 = ohlc（兼容旧行为）', () => {
    expect(snapToCandle(151, 11.1, candles)).toEqual(snapToCandle(151, 11.1, candles, 'ohlc'))
  })

  it('价格远离 OHLC 时仅吸附时间（阈值防护）', () => {
    // 价格 155 距所有 OHLC 均 > 阈值 → 只对齐时间
    const r = snapToCandle(151, 155, candles, 'ohlc')
    expect(r.time).toBe(200)
    expect(r.price).toBe(155)
  })

  it('空数据返回原样', () => {
    expect(snapToCandle(100, 10, [], 'ohlc')).toEqual({ time: 100, price: 10 })
  })
})

describe('normalizeSnapMode（C3 旧值兼容）', () => {
  it('合法枚举原样通过', () => {
    for (const m of ['off', 'time', 'ohlc'] as SnapMode[]) {
      expect(normalizeSnapMode(m)).toBe(m)
    }
  })
  it('旧 boolean true → ohlc（原开关开启语义）', () => {
    expect(normalizeSnapMode(true)).toBe('ohlc')
  })
  it('旧 boolean false → off（原开关关闭语义）', () => {
    expect(normalizeSnapMode(false)).toBe('off')
  })
  it('非法字符串 → off（安全回落）', () => {
    expect(normalizeSnapMode('grid')).toBe('off')
  })
  it('null/undefined/数字 → off', () => {
    expect(normalizeSnapMode(null)).toBe('off')
    expect(normalizeSnapMode(undefined)).toBe('off')
    expect(normalizeSnapMode(123)).toBe('off')
  })
})