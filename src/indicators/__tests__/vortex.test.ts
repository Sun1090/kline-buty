import { describe, expect, it } from 'vitest'
import { calcVortex } from '../vortex'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: 100, isClosed: true }
}

describe('calcVortex（H7 涡旋指标）', () => {
  it('空数组 → 空', () => {
    expect(calcVortex([])).toEqual({ plus: [], minus: [] })
  })

  it('数据不足 n+1 根 → 空', () => {
    const cs = Array.from({ length: 10 }, (_, i) => c(i, i, i + 1, i - 1, i + 0.5))
    expect(calcVortex(cs, 14)).toEqual({ plus: [], minus: [] })
  })

  it('单调上行（每根新高、无回撤）→ VI+ 明显大于 VI−', () => {
    // 每根 high 持续创新高、low 也随之抬高：VMP（|H-PrevL|）> VMM（|L-PrevH|）
    const cs: Candle[] = []
    for (let i = 1; i <= 60; i++) cs.push(c(i, i, i + 2, i, i + 1.5))
    const { plus, minus } = calcVortex(cs, 14)
    expect(plus.length).toBeGreaterThan(0)
    for (let i = 0; i < plus.length; i++) expect(plus[i].value).toBeGreaterThan(minus[i].value)
  })

  it('单调下行（每根新低）→ VI− 大于 VI+', () => {
    const cs: Candle[] = []
    for (let i = 1; i <= 60; i++) cs.push(c(i, 100 - i, 100 - i + 1, 100 - i - 1, 100 - i - 0.5))
    const { plus, minus } = calcVortex(cs, 14)
    expect(minus.length).toBeGreaterThan(0)
    for (let i = 0; i < minus.length; i++) expect(minus[i].value).toBeGreaterThan(plus[i].value)
  })

  it('十字星（high=low）→ 除零兜底为 0，不产生 NaN', () => {
    const cs: Candle[] = [c(0, 10, 10, 10, 10)]
    for (let i = 1; i <= 40; i++) cs.push(c(i, 10, 10, 10, 10))
    const { plus, minus } = calcVortex(cs, 14)
    for (const p of [...plus, ...minus]) expect(Number.isFinite(p.value)).toBe(true)
  })

  it('输出时间戳升序、长度 = 数据量 − n', () => {
    const cs: Candle[] = []
    for (let i = 1; i <= 50; i++) cs.push(c(i, i, i + Math.sin(i / 5), i - 1, i))
    const { plus, minus } = calcVortex(cs, 14)
    expect(plus).toHaveLength(50 - 14)
    expect(minus).toHaveLength(50 - 14)
    for (let i = 1; i < plus.length; i++) expect(plus[i].time).toBeGreaterThan(plus[i - 1].time)
  })
})
