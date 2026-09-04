import { describe, expect, it } from 'vitest'
import { subScaleFixedRange } from '../subScale'

describe('subScaleFixedRange（H12 副图 Y 轴固定范围）', () => {
  it('0-100 型指标 → 固定 0-100', () => {
    for (const k of ['rsi', 'wr', 'stoch', 'mfi', 'psy', 'aroon'] as const) {
      expect(subScaleFixedRange(k)).toEqual({ from: 0, to: 100 })
    }
  })

  it('CCI → 固定 ±300', () => {
    expect(subScaleFixedRange('cci')).toEqual({ from: -300, to: 300 })
  })

  it('无界指标 → null（保持自动）', () => {
    for (const k of ['volume', 'macd', 'kdj', 'obv', 'atr', 'dmi', 'roc', 'mom', 'bbw', 'ao', 'cmf', 'donchian', 'none'] as const) {
      expect(subScaleFixedRange(k)).toBeNull()
    }
  })
})
