import { describe, expect, it } from 'vitest'
import { findGaps, gapHealth } from '../dataHealth'
import type { Candle } from '../types'

function c(time: number): Candle {
  return { time, open: 1, high: 2, low: 1, close: 1.5, volume: 100, isClosed: true }
}

describe('findGaps（G6 数据缺口检测）', () => {
  it('连续序列 → 无缺口', () => {
    const cs = [c(1_000), c(1_060), c(1_120), c(1_180)] // 1m 周期，间隔 60s
    expect(findGaps(cs, '1m')).toEqual([])
  })

  it('单缺口 → 返回区间与长度', () => {
    // 00:00, 00:01, 00:02, 跳到 01:00（缺 57 根）
    const cs = [c(0), c(60), c(120), c(3660)]
    const gaps = findGaps(cs, '1m')
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toEqual({ gapStart: 120, gapEnd: 3660, lengthSec: 3540 })
  })

  it('多缺口 → 按序返回全部', () => {
    const cs = [c(0), c(60), c(3600), c(7200), c(7260)]
    const gaps = findGaps(cs, '1m')
    expect(gaps).toHaveLength(2)
  })

  it('容忍系数：微小时差（≤ 1.5× 周期）不视为缺口', () => {
    const cs = [c(0), c(60), c(120)]
    expect(findGaps(cs, '1m')).toEqual([])
  })

  it('数据不足 2 根 → 空', () => {
    expect(findGaps([c(0)], '1m')).toEqual([])
    expect(findGaps([], '1m')).toEqual([])
  })
})

describe('gapHealth（G6 健康度档位）', () => {
  it('无缺口 → healthy', () => {
    expect(gapHealth([])).toBe('healthy')
  })
  it('1-2 段 → partial', () => {
    expect(gapHealth([{ gapStart: 0, gapEnd: 1, lengthSec: 1 }])).toBe('partial')
    expect(gapHealth([{ gapStart: 0, gapEnd: 1, lengthSec: 1 }, { gapStart: 2, gapEnd: 3, lengthSec: 1 }])).toBe('partial')
  })
  it('≥3 段 → degraded', () => {
    const g = (i: number) => ({ gapStart: i, gapEnd: i + 1, lengthSec: 1 })
    expect(gapHealth([g(0), g(1), g(2)])).toBe('degraded')
  })
})
