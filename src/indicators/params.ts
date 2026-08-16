export interface IndicatorParams {
  maPeriods: number[]
  bollPeriod: number
  bollMult: number
  macdFast: number
  macdSlow: number
  macdSignal: number
  kdjN: number
  kdjM1: number
  kdjM2: number
  rsiPeriod: number
}

export const DEFAULT_INDICATOR_PARAMS: IndicatorParams = {
  maPeriods: [5, 10, 20],
  bollPeriod: 20,
  bollMult: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  kdjN: 9,
  kdjM1: 3,
  kdjM2: 3,
  rsiPeriod: 14,
}
