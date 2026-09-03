import { describe, expect, it } from 'vitest'
import {
  cullWindow,
  shouldCull,
  windowCovers,
  toLocal,
  toGlobal,
  localRange,
  anchorRangeForSwitch,
  CULL_MARGIN,
} from '../cull'

describe('cullWindow 可见窗口计算', () => {
  it('常规：可见区间外扩 margin 并 clamp 到数据边界', () => {
    const w = cullWindow(20_000, { from: 9_000, to: 10_000 })
    expect(w).toEqual({ start: 8_500, end: 10_500 })
  })

  it('左边界：起始为 0 时 clamp 到 0', () => {
    const w = cullWindow(20_000, { from: 100, to: 1_000 })
    expect(w.start).toBe(0)
    expect(w.end).toBe(1_500)
  })

  it('右边界：结束为 len 时 clamp 到 len', () => {
    const w = cullWindow(20_000, { from: 19_000, to: 19_900 })
    expect(w.start).toBe(18_500)
    expect(w.end).toBe(20_000)
  })

  it('数据不足阈值时窗口仍是全量（start=0,end=len）', () => {
    const w = cullWindow(800, { from: 0, to: 800 })
    expect(w).toEqual({ start: 0, end: 800 })
  })

  it('空数据返回空窗口', () => {
    expect(cullWindow(0, { from: 0, to: 0 })).toEqual({ start: 0, end: 0 })
  })

  it('可见区间在末尾之外（数据增长竞态）时 clamp 至少 1 根', () => {
    const w = cullWindow(5, { from: 10, to: 12 })
    expect(w.start).toBeGreaterThanOrEqual(0)
    expect(w.end).toBeLessThanOrEqual(5)
    expect(w.end - w.start).toBeGreaterThan(0)
  })

  it('margin 可自定义', () => {
    expect(cullWindow(20_000, { from: 9_000, to: 10_000 }, 100)).toEqual({ start: 8_900, end: 10_100 })
  })
})

describe('shouldCull / windowCovers / 坐标映射', () => {
  it('数据量超过阈值才裁剪', () => {
    expect(shouldCull(800)).toBe(false)
    expect(shouldCull(2001)).toBe(true)
    expect(shouldCull(2000)).toBe(false)
  })

  it('可见区间在窗口内部时无需重载（含边界）', () => {
    const w = { start: 500, end: 2500 }
    expect(windowCovers(w, { from: 500, to: 2500 })).toBe(true)
    expect(windowCovers(w, { from: 600, to: 2400 })).toBe(true)
  })

  it('可见区间越出窗口时需重载', () => {
    const w = { start: 500, end: 2500 }
    expect(windowCovers(w, { from: 480, to: 2400 })).toBe(false)
    expect(windowCovers(w, { from: 600, to: 2600 })).toBe(false)
  })

  it('全局 ↔ 局部索引互转', () => {
    const w = { start: 500, end: 2500 }
    expect(toLocal(w, 900)).toBe(400)
    expect(toGlobal(w, 400)).toBe(900)
    expect(toGlobal(null, 400)).toBe(400)
  })

  it('localRange 保持可见视角（重载后重映射）', () => {
    const w = { start: 500, end: 2500 }
    expect(localRange(w, { from: 900, to: 1400 })).toEqual({ from: 400, to: 900 })
  })

  it('margin 常量大于最长指标回看（Ichimoku 52 / SAR 前置）', () => {
    expect(CULL_MARGIN).toBeGreaterThanOrEqual(100)
  })
})

describe('anchorRangeForSwitch（G2 周期切换锚定）', () => {
  // 模拟 1m 周期数据：每根 60s，起始 2026-09-02 00:00:00 UTC
  const base = 1_788_307_200
  const candles1m = Array.from({ length: 120 }, (_, i) => ({ time: base + i * 60 }))

  it('空数据返回 null', () => {
    expect(anchorRangeForSwitch([], base, 60_000, 60_000)).toBeNull()
  })

  it('右缘时间精确命中某根 → 该根为右缘，根数 = 跨度/周期', () => {
    // 可见 20 根：from 100 → to 119（时间 base+119*60），跨度 20 根 = 1_200_000ms
    const r = anchorRangeForSwitch(candles1m, base + 119 * 60, 1_200_000, 60_000)
    expect(r).toEqual({ from: 100, to: 119 })
  })

  it('右缘时间不在数据上 → 二分取最后一个 ≤ toTime 的索引', () => {
    // toTime 落在 base+50*60 与 base+51*60 之间 → 右缘应为索引 50
    // 跨度 600_000ms / 60_000 = 10 根 → from = 50-10+1 = 41
    const r = anchorRangeForSwitch(candles1m, base + 50 * 60 + 30, 600_000, 60_000)
    expect(r).toEqual({ from: 41, to: 50 })
  })

  it('跨度不足一根 → 根数最小为 1', () => {
    const r = anchorRangeForSwitch(candles1m, base + 10 * 60, 500, 60_000)
    expect(r).toEqual({ from: 10, to: 10 })
  })

  it('跨度远大于数据量 → 左缘 clamp 到 0', () => {
    const r = anchorRangeForSwitch(candles1m, base + 10 * 60, 60 * 60_000, 60_000)
    expect(r!.from).toBe(0)
    expect(r!.to).toBe(10)
  })
})
