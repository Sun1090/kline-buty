import { describe, expect, it } from 'vitest'
import { generateSyntheticCandles, tickSynthetic, readPerfParam } from '../synthetic'

describe('generateSyntheticCandles', () => {
  it('生成指定数量、时间递增的 K 线', () => {
    const cs = generateSyntheticCandles(20_000, { startTime: 1_700_000_000, stepSeconds: 60 })
    expect(cs).toHaveLength(20_000)
    // G1：起始时间非整分 → 向下对齐到 1m 边界（1_700_000_000 → 1_699_999_980）
    expect(cs[0].time).toBe(1_699_999_980)
    expect(cs[1].time - cs[0].time).toBe(60)
    expect(cs[cs.length - 1].time - cs[0].time).toBe(60 * 19_999)
  })

  it('OHLC 不变量：high ≥ 最高、low ≤ 最低', () => {
    const cs = generateSyntheticCandles(500)
    for (const c of cs) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close))
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close))
      expect(c.close).toBeGreaterThan(0)
    }
  })

  it('确定性：同参数两次生成完全一致', () => {
    const a = generateSyntheticCandles(1000, { startTime: 1, stepSeconds: 60, base: 100, vol: 10 })
    const b = generateSyntheticCandles(1000, { startTime: 1, stepSeconds: 60, base: 100, vol: 10 })
    expect(a).toEqual(b)
  })
})

describe('tickSynthetic', () => {
  it('保持 time/open 不变，更新 close/high/low/volume 并标记未收盘', () => {
    const last = generateSyntheticCandles(1, { startTime: 1_700_000_000 })[0]
    const t = tickSynthetic(last, 5)
    expect(t.time).toBe(last.time)
    expect(t.open).toBe(last.open)
    expect(t.isClosed).toBe(false)
    expect(t.volume).toBe(last.volume + 1)
    expect(t.high).toBeGreaterThanOrEqual(t.close)
    expect(t.low).toBeLessThanOrEqual(t.close)
  })
})

describe('readPerfParam', () => {
  it('?perf=20000 → 20000；无参 → 0', () => {
    expect(readPerfParam('?perf=20000')).toBe(20_000)
    expect(readPerfParam('')).toBe(0)
    expect(readPerfParam('?symbol=BTCUSDT')).toBe(0)
  })
  it('非法/超大值 clamp', () => {
    expect(readPerfParam('?perf=abc')).toBe(0)
    expect(readPerfParam('?perf=-5')).toBe(0)
    expect(readPerfParam('?perf=999999')).toBe(100_000)
  })
})
