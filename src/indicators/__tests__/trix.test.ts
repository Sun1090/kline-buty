import { describe, expect, it } from 'vitest'
import { calcTRIX } from '../trix'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close - 1, high: close + 1, low: close - 1, close, volume: 100, isClosed: true }
}

describe('calcTRIX（H5 三重指数平均变化率）', () => {
  it('空数组 → 空', () => {
    expect(calcTRIX([])).toEqual([])
  })

  it('数据不足 → 空（需足够根数完成三次 EMA 平滑 + 一阶差分）', () => {
    const cs = Array.from({ length: 10 }, (_, i) => c(i, 100 + i))
    expect(calcTRIX(cs, 15)).toEqual([])
  })

  it('单调上行 → TRIX 为正', () => {
    const cs = Array.from({ length: 80 }, (_, i) => c(i, 100 + i))
    const out = calcTRIX(cs, 15)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) expect(p.value).toBeGreaterThan(0)
  })

  it('单调下行 → TRIX 为负', () => {
    const cs = Array.from({ length: 80 }, (_, i) => c(i, 300 - i))
    const out = calcTRIX(cs, 15)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) expect(p.value).toBeLessThan(0)
  })

  it('常数序列 → TRIX ≈ 0（EMA 收敛后变化率为 0）', () => {
    const cs = Array.from({ length: 80 }, (_, i) => c(i, 100))
    const out = calcTRIX(cs, 15)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) expect(Math.abs(p.value)).toBeLessThan(0.0001)
  })

  it('输出时间戳与输入对齐（e3 首项后开始）', () => {
    const cs = Array.from({ length: 60 }, (_, i) => c(i, 100 + Math.sin(i / 5) * 10))
    const out = calcTRIX(cs, 15)
    expect(out.length).toBeLessThan(cs.length)
    // 时间严格升序
    for (let i = 1; i < out.length; i++) expect(out[i].time).toBeGreaterThan(out[i - 1].time)
  })
})
