import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { sessionExtremes } from '../session'

const c = (time: number, high: number, low: number): Candle =>
  ({ time, open: (high + low) / 2, high, low, close: (high + low) / 2, volume: 1, isClosed: true })

// 2026-01-05 00:00 UTC 秒级时间戳
const DAY = 1_767_052_800
const HOUR = 3_600

describe('sessionExtremes', () => {
  it('空数据 → null', () => {
    expect(sessionExtremes([])).toBeNull()
  })
  it('最新 K 线所在 UTC 日的高低点（当日区间）', () => {
    const candles = [
      c(DAY + 0 * HOUR, 100, 90),
      c(DAY + 1 * HOUR, 110, 95),
      c(DAY + 2 * HOUR, 105, 80),
    ]
    const s = sessionExtremes(candles)
    expect(s).toEqual({ dayStart: DAY, high: 110, low: 80 })
  })
  it('只统计最新 K 线所在日（昨日 K 线不参与今日会话）', () => {
    const candles = [
      c(DAY - HOUR, 500, 100), // 昨日，high 远高于今日
      c(DAY + 0 * HOUR, 100, 90),
      c(DAY + 1 * HOUR, 110, 95),
    ]
    const s = sessionExtremes(candles)
    expect(s).toEqual({ dayStart: DAY, high: 110, low: 90 })
  })
  it('跨日边界：最新 K 线为新日 → 新日区间', () => {
    const candles = [
      c(DAY + 22 * HOUR, 100, 90),
      c(DAY + 23 * HOUR, 120, 85), // 上一日
      c(DAY + 1 * 86_400 + 0, 50, 40), // 新日第一根
      c(DAY + 1 * 86_400 + HOUR, 60, 30),
    ]
    const s = sessionExtremes(candles)
    expect(s).toEqual({ dayStart: DAY + 86_400, high: 60, low: 30 })
  })
  it('会话日无完整高低（仅一根）也返回', () => {
    const s = sessionExtremes([c(DAY, 55, 45)])
    expect(s).toEqual({ dayStart: DAY, high: 55, low: 45 })
  })
})
