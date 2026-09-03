/** H2 副图阈值区间背景（超买/超卖带）：各指标的 [from, to] 阈值区间。 */
export interface ThresholdZone {
  from: number
  to: number
}

/**
 * 返回某副图指标的阈值区间列表（无则空数组）。
 * 区间按「数值带」语义：RSI/WR/STOCH/MFI 等 0-100 指标取上下沿，
 * CCI 取 ±100 外扩带，PSY/Aroon 取高位/低位带。
 */
export function thresholdZones(kind: string): ThresholdZone[] {
  switch (kind) {
    case 'rsi':
      return [
        { from: 70, to: 100 },
        { from: 0, to: 30 },
      ]
    case 'wr':
      return [
        { from: 80, to: 100 },
        { from: 0, to: 20 },
      ]
    case 'cci':
      return [
        { from: 100, to: 300 },
        { from: -300, to: -100 },
      ]
    case 'psy':
      return [
        { from: 75, to: 100 },
        { from: 0, to: 25 },
      ]
    case 'stoch':
      return [
        { from: 80, to: 100 },
        { from: 0, to: 20 },
      ]
    case 'mfi':
      return [
        { from: 80, to: 100 },
        { from: 0, to: 20 },
      ]
    case 'aroon':
      return [
        { from: 70, to: 100 },
        { from: 0, to: 30 },
      ]
    default:
      return []
  }
}
