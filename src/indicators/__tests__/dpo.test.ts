import { describe, expect, it } from 'vitest'
import { calcDPO } from '../dpo'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close - 1, high: close + 1, low: close - 1, close, volume: 100, isClosed: true }
}

describe('calcDPO（H6 去势价格振荡）', () => {
  it('空数组 → 空', () => {
    expect(calcDPO([])).toEqual([])
  })

  it('数据不足 n → 空', () => {
    const cs = Array.from({ length: 10 }, (_, i) => c(i, 100))
    expect(calcDPO(cs, 20)).toEqual([])
  })

  it('常数序列 → DPO ≈ 0（去趋势后无摆动）', () => {
    const cs = Array.from({ length: 60 }, (_, i) => c(i, 100))
    const out = calcDPO(cs, 20)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) expect(Math.abs(p.value)).toBeLessThan(0.0001)
  })

  it('线性上行序列 → DPO 恒定正值（趋势被去，残留恒定偏差）', () => {
    const cs = Array.from({ length: 80 }, (_, i) => c(i, 100 + 2 * i))
    const out = calcDPO(cs, 20)
    expect(out.length).toBeGreaterThan(0)
    // 线性趋势：SMA 滞后 offset 根 = 2*offset，DPO 恒 = 2*offset
    const first = out[0].value
    for (const p of out) expect(p.value).toBeCloseTo(first)
    expect(first).toBeGreaterThan(0)
  })

  it('周期摆动 → DPO 围绕 0 正负交替', () => {
    const cs = Array.from({ length: 80 }, (_, i) => c(i, 100 + Math.sin(i / 5) * 10))
    const out = calcDPO(cs, 20)
    expect(out.length).toBeGreaterThan(0)
    // 至少出现过正与负
    expect(out.some((p) => p.value > 0)).toBe(true)
    expect(out.some((p) => p.value < 0)).toBe(true)
  })

  it('输出时间戳与输入对齐且升序', () => {
    const cs = Array.from({ length: 60 }, (_, i) => c(i, 100 + Math.sin(i / 4) * 8))
    const out = calcDPO(cs, 20)
    expect(out.length).toBeLessThan(cs.length)
    for (let i = 1; i < out.length; i++) expect(out[i].time).toBeGreaterThan(out[i - 1].time)
  })
})
