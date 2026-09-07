import { describe, expect, it } from 'vitest'
import { downsampleCandles } from '../downsample'

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ time: i }))

describe('downsampleCandles（G15 数据量自适应降采样）', () => {
  it('数量 ≤ 目标 → 原样返回（不改动）', () => {
    const c = mk(5)
    expect(downsampleCandles(c, 5)).toBe(c)
    expect(downsampleCandles(c, 100)).toBe(c)
  })
  it('数量 > 目标 → 返回恰好 target 根、时间升序、保留最后一根', () => {
    const out = downsampleCandles(mk(10), 4)
    expect(out).toHaveLength(4)
    expect(out[out.length - 1].time).toBe(9) // 恒保留最新
    expect(out[0].time).toBe(0) // 覆盖起点
    for (let i = 1; i < out.length; i++) expect(out[i].time).toBeGreaterThan(out[i - 1].time)
  })
  it('target ≤ 0 → 原样返回（无效目标兜底，不缩数据）', () => {
    const c = mk(5)
    expect(downsampleCandles(c, 0)).toBe(c)
    expect(downsampleCandles(c, -1)).toBe(c)
  })
  it('不修改入参（纯函数）', () => {
    const c = mk(100)
    const before = c.map((x) => x.time)
    downsampleCandles(c, 10)
    expect(c.map((x) => x.time)).toEqual(before)
  })
})
