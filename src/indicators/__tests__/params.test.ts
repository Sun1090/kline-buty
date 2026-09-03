import { describe, expect, it } from 'vitest'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from '../params'

describe('DEFAULT_INDICATOR_PARAMS', () => {
  it('主图参数：MA 周期组 / BOLL / SAR / 一目均衡', () => {
    const p = DEFAULT_INDICATOR_PARAMS
    expect(p.maPeriods).toEqual([5, 10, 20])
    expect(p.bollPeriod).toBe(20)
    expect(p.bollMult).toBe(2)
    // SAR：AF 起步 0.02、步长 0.02、上限 0.2
    expect(p.sarAfStart).toBe(0.02)
    expect(p.sarAfStep).toBe(0.02)
    expect(p.sarAfMax).toBe(0.2)
    // 一目均衡标准周期
    expect(p.ichimokuTenkan).toBe(9)
    expect(p.ichimokuKijun).toBe(26)
    expect(p.ichimokuSpanB).toBe(52)
    expect(p.ichimokuDisplacement).toBe(26)
  })

  it('副图参数：MACD/KDJ/RSI/WR 等', () => {
    const p = DEFAULT_INDICATOR_PARAMS
    expect(p.macdFast).toBe(12)
    expect(p.macdSlow).toBe(26)
    expect(p.macdSignal).toBe(9)
    expect(p.kdjN).toBe(9)
    expect(p.kdjM1).toBe(3)
    expect(p.kdjM2).toBe(3)
    expect(p.rsiPeriod).toBe(14)
    expect(p.wrPeriod).toBe(14)
    expect(p.atrPeriod).toBe(14)
    expect(p.dmiPeriod).toBe(14)
    expect(p.cciPeriod).toBe(20)
    expect(p.psyPeriod).toBe(12)
  })

  it('所有周期值为正整数', () => {
    const p = DEFAULT_INDICATOR_PARAMS
    const periods: number[] = [
      p.bollPeriod, p.ichimokuTenkan, p.ichimokuKijun, p.ichimokuSpanB, p.ichimokuDisplacement,
      p.macdFast, p.macdSlow, p.macdSignal, p.kdjN, p.kdjM1, p.kdjM2,
      p.rsiPeriod, p.wrPeriod, p.obvMaPeriod, p.atrPeriod, p.dmiPeriod,
      p.cciPeriod, p.psyPeriod, p.stochK, p.stochSmooth, p.stochD,
      p.rocPeriod, p.momPeriod, p.volMaPeriod,
    ]
    for (const v of periods) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThan(0)
    }
    // maPeriods 每项也是正整数
    for (const v of p.maPeriods) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThan(0)
    }
  })

  it('SAR AF 递进关系：start ≤ step ≤ max', () => {
    const p = DEFAULT_INDICATOR_PARAMS
    expect(p.sarAfStart).toBeLessThanOrEqual(p.sarAfMax)
    expect(p.sarAfStep).toBeLessThanOrEqual(p.sarAfMax)
  })

  it('MACD fast < slow（金叉逻辑前提）', () => {
    const p = DEFAULT_INDICATOR_PARAMS
    expect(p.macdFast).toBeLessThan(p.macdSlow)
  })

  it('IndicatorParams 类型键全集（防止误删字段）', () => {
    const keys: (keyof IndicatorParams)[] = [
      'maPeriods', 'bollPeriod', 'bollMult',
      'sarAfStart', 'sarAfStep', 'sarAfMax',
      'ichimokuTenkan', 'ichimokuKijun', 'ichimokuSpanB', 'ichimokuDisplacement',
      'macdFast', 'macdSlow', 'macdSignal',
      'kdjN', 'kdjM1', 'kdjM2',
      'rsiPeriod', 'wrPeriod', 'obvMaPeriod', 'atrPeriod', 'dmiPeriod',
      'cciPeriod', 'psyPeriod', 'stochK', 'stochSmooth', 'stochD',
      'rocPeriod', 'momPeriod', 'volMaPeriod',
    ]
    for (const k of keys) {
      expect(DEFAULT_INDICATOR_PARAMS[k]).toBeDefined()
    }
  })
})
