import { describe, expect, it } from 'vitest'
import { generateSyntheticCandles, tickSynthetic, readPerfParam } from '../synthetic'

describe('generateSyntheticCandles', () => {
  it('生成指定数量、时间递增的 K 线（A2：终点对齐边界、最新在末尾）', () => {
    const cs = generateSyntheticCandles(20_000, { startTime: 1_700_000_000, stepSeconds: 60 })
    expect(cs).toHaveLength(20_000)
    // A1：起始时间非整分 → 终点向下对齐到 1m 边界（1_700_000_000 → 1_699_999_980）
    expect(cs[cs.length - 1].time).toBe(1_699_999_980)
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

  it('A1 period 感知：步长 = 周期毫秒/1000，且起点对齐该周期边界', () => {
    // startTime 非 5m 边界 → 首根落到边界，间隔 300s
    const t = 1_700_000_000 + 42
    const cs = generateSyntheticCandles(100, { startTime: t, period: '5m' })
    expect(cs[0].time % 300).toBe(0)
    expect(cs[0].time).toBeLessThanOrEqual(t)
    for (let i = 1; i < cs.length; i++) expect(cs[i].time - cs[i - 1].time).toBe(300)
  })

  it('A1 period 感知：1d 步长 86400s 且首根 UTC 零点', () => {
    const cs = generateSyntheticCandles(10, { startTime: 1_700_000_000, period: '1d' })
    expect(cs[0].time % 86_400).toBe(0)
    expect(cs[1].time - cs[0].time).toBe(86_400)
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
