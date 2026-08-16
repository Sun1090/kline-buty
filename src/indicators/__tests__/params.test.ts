import { describe, expect, it } from 'vitest'
import { DEFAULT_INDICATOR_PARAMS } from '../params'

/** 默认参数 = 各指标标准算法默认值（与 TradingView/交易所一致） */
const STANDARD: Record<string, number> = {
  bollPeriod: 20,
  bollMult: 2,
  sarAfStart: 0.02,
  sarAfStep: 0.02,
  sarAfMax: 0.2,
  ichimokuTenkan: 9,
  ichimokuKijun: 26,
  ichimokuSpanB: 52,
  ichimokuDisplacement: 26,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  kdjN: 9,
  kdjM1: 3,
  kdjM2: 3,
  rsiPeriod: 14,
  wrPeriod: 14,
  obvMaPeriod: 1,
  atrPeriod: 14,
  dmiPeriod: 14,
  cciPeriod: 20,
  psyPeriod: 12,
  stochK: 14,
  stochSmooth: 3,
  stochD: 3,
  rocPeriod: 12,
  momPeriod: 10,
}

describe('DEFAULT_INDICATOR_PARAMS', () => {
  it('覆盖全部 27 个参数键（主图 10 + 副图 17）', () => {
    const numericKeys = Object.keys(DEFAULT_INDICATOR_PARAMS).filter((k) => k !== 'maPeriods')
    expect(numericKeys.sort()).toEqual(Object.keys(STANDARD).sort())
  })

  it('数值参数均为正数且匹配标准默认值', () => {
    for (const [k, v] of Object.entries(STANDARD)) {
      const actual = DEFAULT_INDICATOR_PARAMS[k as keyof typeof DEFAULT_INDICATOR_PARAMS] as number
      expect(actual, k).toBe(v)
      expect(actual).toBeGreaterThan(0)
    }
  })

  it('MA 周期列表默认 [5,10,20] 且全为正整数', () => {
    expect(DEFAULT_INDICATOR_PARAMS.maPeriods).toEqual([5, 10, 20])
    for (const p of DEFAULT_INDICATOR_PARAMS.maPeriods) {
      expect(Number.isInteger(p)).toBe(true)
      expect(p).toBeGreaterThan(0)
    }
  })

  it('SAR 加速参数满足 起步 ≤ 步进 ≤ 上限 约束', () => {
    const { sarAfStart, sarAfStep, sarAfMax } = DEFAULT_INDICATOR_PARAMS
    expect(sarAfStart).toBeLessThanOrEqual(sarAfStep)
    expect(sarAfStep).toBeLessThanOrEqual(sarAfMax)
  })
})
