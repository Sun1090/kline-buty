import { describe, expect, it } from 'vitest'
import {
  cullWindow,
  shouldCull,
  type CullRange,
  type CullWindow,
  windowCovers,
  toLocal,
  toGlobal,
  localRange,
  anchorRangeForSwitch,
  nextCullWindow,
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

describe('nextCullWindow 窗口迁移判定（A2 视野塌缩根因护栏）', () => {
  /** 多数用例里「图表装载的」就是 cur；tail 生长用例显式传入更宽的装载区间 */
  const next = (cur: CullWindow | null, view: CullRange, len: number, loaded = cur) =>
    nextCullWindow(cur, loaded ?? { start: 0, end: len }, view, len)

  it('数据量未超阈值 → 不裁剪', () => {
    expect(next(null, { from: 0, to: 500 }, 800)).toBeNull()
    expect(next({ start: 0, end: 900 }, { from: 0, to: 500 }, 800)).toBeNull()
  })

  it('首个窗口按视角建立', () => {
    expect(next(null, { from: 9_000, to: 10_000 }, 20_000)).toEqual({ start: 8_500, end: 10_500 })
  })

  it('窗口内滚动/缩放 → 原窗口引用不动（零重载）', () => {
    const cur = { start: 8_500, end: 10_500 }
    // 视角右移 1 根，仍贴着窗口内沿
    expect(next(cur, { from: 9_001, to: 10_001 }, 20_000)).toBe(cur)
    // 用户放大到 3 根窄视角（旧实现在这里重算出 {8_999,10_002} → start 漂移 → 整窗重载）
    expect(next(cur, { from: 9_400, to: 9_402 }, 20_000)).toBe(cur)
  })

  it('视角越出装载区间（左/右两侧）→ 迁移到新窗口', () => {
    const cur = { start: 8_500, end: 10_500 }
    expect(next(cur, { from: 8_000, to: 8_400 }, 20_000)).toEqual({ start: 7_500, end: 8_900 })
    expect(next(cur, { from: 10_600, to: 11_000 }, 20_000)).toEqual({ start: 10_100, end: 11_500 })
  })

  it('贴尾沿实时生长：装载区间跟着数据变宽，视角顶到新末根也不算越界（旧实现每根新 K 线都迁移）', () => {
    const cur = { start: 2_998, end: 3_000 }
    const grown = { start: 2_998, end: 3_500 } // 窗口状态未变，但切片已随数据长到 3_500
    expect(next(cur, { from: 3_498, to: 3_499 }, 3_500, grown)).toBe(cur)
    // 真越出装载区间才迁移
    expect(next(cur, { from: 3_498, to: 3_499 }, 3_500, cur)).toEqual({ start: 2_998, end: 3_500 })
  })

  it('左缘空转超过一个余量 → 迁移回收左侧（窗口不会随数据无限膨胀）', () => {
    const cur = { start: 1_548, end: 3_000 }
    // 视角缩到尾部窄段：仍被 cur 覆盖，但 cur.start 已比需要的靠左 1000+ 根
    expect(next(cur, { from: 2_900, to: 2_999 }, 3_000)).toEqual({ start: 2_400, end: 3_000 })
  })

  it('任何迁移都必须完整容纳当前视角（否则恢复视角会出现负局部索引，视野被压扁）', () => {
    const len = 20_000
    for (const view of [
      { from: 0, to: 1 },
      { from: 0, to: 12_000 },
      { from: 19_998, to: 19_999 },
      { from: 19_000, to: 19_999 },
      { from: 5_000, to: 5_001 },
      { from: 9_500, to: 9_600 },
    ]) {
      for (const cur of [null, { start: 0, end: 500 }, { start: 9_000, end: 10_000 }] as const) {
        const r = next(cur, view, len)
        if (!r) continue
        expect(r.start).toBeLessThanOrEqual(view.from)
        expect(r.end).toBeGreaterThanOrEqual(view.to)
      }
    }
  })

  it('反复喂同一视角必须收敛为不动点（旧实现会 start 逐根漂移、视野在 2~5 根自锁振荡）', () => {
    let cur = next(null, { from: 10_000, to: 10_900 }, 20_000)!
    for (let i = 0; i < 50; i++) {
      const r = next(cur, { from: 10_000, to: 10_900 }, 20_000)
      expect(r).toBe(cur)
      cur = r!
    }
  })

  it('实时追尾 300 根：窗口最多迁移 1 次，且始终容纳视角', () => {
    // 视角每步右移 1 根、数据每步长 1 根（图表装载区间随之变宽）
    let tail = next(null, { from: 19_100, to: 19_999 }, 20_001)!
    let moves = 0
    for (let i = 0; i < 300; i++) {
      const view = { from: 19_101 + i, to: 20_000 + i }
      const len = 20_001 + i
      const loaded = { start: tail.start, end: len } // 贴尾沿：切片右端跟着数据生长
      const r = next(tail, view, len, loaded)!
      expect(r.start).toBeLessThanOrEqual(view.from)
      // 贴尾沿时窗口 end 是「记录时的数据长度」，实际切片随数据继续生长到 len
      expect(Math.max(r.end, len)).toBeGreaterThanOrEqual(view.to)
      if (r !== tail) moves++
      tail = r
    }
    expect(moves).toBeLessThanOrEqual(1)
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

  it('跨度不足一根 → A2 保底扩展为至少 2 根（单根区间在 setVisibleLogicalRange 下不稳定）', () => {
    // 跨度 500ms < 1 根 → 原本 {10,10}，现在左缘扩展一根保证 from < to
    const r = anchorRangeForSwitch(candles1m, base + 10 * 60, 500, 60_000)
    expect(r).toEqual({ from: 9, to: 10 })
  })

  it('跨度远大于数据量 → 左缘 clamp 到 0', () => {
    const r = anchorRangeForSwitch(candles1m, base + 10 * 60, 60 * 60_000, 60_000)
    expect(r!.from).toBe(0)
    expect(r!.to).toBe(10)
  })

  it('A2 目标时间早于全部数据（回看跨周期新数据未覆盖）→ 从最左展示 spanRoots 根而非退化单根', () => {
    // toTime 早于 data[0]：右缘 clamp 到 0 后 span 应保留（5 根）
    const r = anchorRangeForSwitch(candles1m, base - 3_600, 5 * 60_000, 60_000)
    expect(r).toEqual({ from: 0, to: 4 })
    // 若 spanRoots 超出数据量 → 右缘 clamp 到数据末尾
    const r2 = anchorRangeForSwitch(candles1m, base - 3_600, 200 * 60_000, 60_000)
    expect(r2).toEqual({ from: 0, to: candles1m.length - 1 })
  })
})
