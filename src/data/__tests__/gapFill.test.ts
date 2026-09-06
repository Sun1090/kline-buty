import { describe, expect, it, vi } from 'vitest'
import { gapFillRanges, GAP_PAGE_SIZE, GAP_MAX_PAGES, runRefillPages } from '../gapFill'

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

  it('A1 lastTime 非对齐 → 起点先对齐到周期边界', () => {
    // last 01:30 → 起点对齐到 01:00（自定义源/缓存非对齐时间戳不再造成游标错位）
    const r = gapFillRanges(base + 90, base + 30 * 60, '1m')
    expect(r[0].startTime).toBe((base + 60) * 1000)
  })

  it('A1 1M 页宽用 31 天上界（防 30 天近似使页宽过窄）', () => {
    // last 取月初（2026-09-01），断线 40 个月 → 31 天上界页宽(500×31d) > 跨度 → 恰好 1 段
    const last = Date.UTC(2026, 8, 1) / 1000
    const now = last + 40 * 30 * 86_400
    const r = gapFillRanges(last, now, '1M')
    expect(r).toHaveLength(1)
    expect(r[0].startTime).toBe(last * 1000)
    expect(r[0].endTime).toBe(now * 1000)
  })
})

describe('runRefillPages（A3 断线分段补洞编排）', () => {
  const ranges = [
    { startTime: 1000, endTime: 2000 },
    { startTime: 2000, endTime: 3000 },
    { startTime: 3000, endTime: 4000 },
  ]

  it('串行逐段执行，进度从 0 递增到 total', async () => {
    const calls: number[] = []
    const progress: number[][] = []
    const { ok, failed } = await runRefillPages(
      ranges,
      (r) => {
        calls.push(r.startTime)
        return Promise.resolve()
      },
      (p) => progress.push([p.done, p.total]),
    )
    expect(calls).toEqual([1000, 2000, 3000]) // 严格串行、按序
    expect(progress).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]) // 起始 0 + 每页完成后递增
    expect(ok).toBe(3)
    expect(failed).toBe(0)
  })

  it('失败页跳过继续下一页，进度含失败计数', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)
    const progress: number[][] = []
    const { ok, failed } = await runRefillPages(ranges, fetchPage, (p) => progress.push([p.done, p.failed]))
    expect(ok).toBe(2)
    expect(failed).toBe(1)
    expect(progress).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]) // 失败页仍占 done，failed 累计
    expect(fetchPage).toHaveBeenCalledTimes(3) // 失败不中断
  })

  it('空区间立即完成', async () => {
    const { ok, failed } = await runRefillPages([], () => Promise.resolve())
    expect(ok).toBe(0)
    expect(failed).toBe(0)
  })
})