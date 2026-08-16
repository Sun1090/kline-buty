import { describe, expect, it } from 'vitest'
import {
  cullWindow,
  shouldCull,
  windowCovers,
  toLocal,
  toGlobal,
  localRange,
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
