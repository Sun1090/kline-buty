import { describe, expect, it } from 'vitest'
import { thresholdZones } from '../thresholdZones'

describe('thresholdZones（H2 副图阈值区间）', () => {
  it('RSI：超买 70-100 / 超卖 0-30', () => {
    expect(thresholdZones('rsi')).toEqual([
      { from: 70, to: 100 },
      { from: 0, to: 30 },
    ])
  })

  it('WR：80-100 / 0-20', () => {
    expect(thresholdZones('wr')).toEqual([
      { from: 80, to: 100 },
      { from: 0, to: 20 },
    ])
  })

  it('CCI：±100 外扩带（100-300 / -300--100）', () => {
    expect(thresholdZones('cci')).toEqual([
      { from: 100, to: 300 },
      { from: -300, to: -100 },
    ])
  })

  it('PSY / STOCH / MFI / Aroon 均有定义', () => {
    expect(thresholdZones('psy').length).toBeGreaterThan(0)
    expect(thresholdZones('stoch').length).toBeGreaterThan(0)
    expect(thresholdZones('mfi').length).toBeGreaterThan(0)
    expect(thresholdZones('aroon').length).toBeGreaterThan(0)
  })

  it('无阈值指标（volume/macd/kdj/obv/atr/dmi/roc/mom/ao/cmf/donchian）→ 空', () => {
    for (const k of ['volume', 'macd', 'kdj', 'obv', 'atr', 'dmi', 'roc', 'mom', 'ao', 'cmf', 'donchian', 'bbw']) {
      expect(thresholdZones(k)).toEqual([])
    }
  })
})
