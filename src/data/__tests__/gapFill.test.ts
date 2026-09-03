import { describe, expect, it } from 'vitest'
import { gapFillRanges, GAP_PAGE_SIZE, GAP_MAX_PAGES } from '../gapFill'

describe('gapFillRanges（G7 断线分段补洞）', () => {
  const base = 1_788_307_200 // 2026-09-02 00:00:00 UTC

  it('now ≤ last（时钟回拨 / 无丢失）→ 空', () => {
    expect(gapFillRanges(base, base, '1m')).toEqual([])
    expect(gapFillRanges(base, base - 60, '1m')).toEqual([])
  })

  it('断线 < 一页 → 单段补洞', () => {
    // last 00:00，now 00:30（30 根 1m）→ 单页 [base*1000, base+30min]
    const r = gapFillRanges(base, base + 30 * 60, '1m')
    expect(r).toHaveLength(1)
    expect(r[0]).toEqual({ startTime: base * 1000, endTime: (base + 30 * 60) * 1000 })
  })

  it('断线超过一页 → 切分为连续多段（升序、首尾相接不重不漏）', () => {
    // 1200 根 1m（20 分钟 → 跨 2.4 页）→ 应切 3 段
    const last = base
    const now = base + 1200 * 60
    const r = gapFillRanges(last, now, '1m')
    expect(r.length).toBeGreaterThan(1)
    // 首段从 last 开始
    expect(r[0].startTime).toBe(base * 1000)
    // 末段止于 now
    expect(r[r.length - 1].endTime).toBe(now * 1000)
    // 相邻段无缝（前段 end == 后段 start），无重叠
    for (let i = 1; i < r.length; i++) expect(r[i].startTime).toBe(r[i - 1].endTime)
  })

  it('单页段数受 GAP_PAGE_SIZE 控制', () => {
    // 恰好一页（500 根）→ 1 段
    const r = gapFillRanges(base, base + GAP_PAGE_SIZE * 60, '1m')
    expect(r).toHaveLength(1)
  })

  it('极端长断线受 GAP_MAX_PAGES 上限保护', () => {
    // 远超上限：now 距 last 2000 页 → 只返回 maxPages 段，不再无限拉取
    const last = base
    const now = base + GAP_MAX_PAGES * GAP_PAGE_SIZE * 60 * 10
    const r = gapFillRanges(last, now, '1m')
    expect(r.length).toBe(GAP_MAX_PAGES)
    expect(r[r.length - 1].endTime).toBeLessThan(now * 1000) // 被截断，未覆盖到 now
  })
})