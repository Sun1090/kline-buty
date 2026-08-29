export interface IndicatorParams {
  // 主图
  maPeriods: number[]
  bollPeriod: number
  bollMult: number
  sarAfStart: number
  sarAfStep: number
  sarAfMax: number
  ichimokuTenkan: number
  ichimokuKijun: number
  ichimokuSpanB: number
  ichimokuDisplacement: number
  // 副图
  macdFast: number
  macdSlow: number
  macdSignal: number
  kdjN: number
  kdjM1: number
  kdjM2: number
  rsiPeriod: number
  wrPeriod: number
  obvMaPeriod: number
  atrPeriod: number
  dmiPeriod: number
  cciPeriod: number
  psyPeriod: number
  stochK: number
  stochSmooth: number
  stochD: number
  rocPeriod: number
  momPeriod: number
  bbwPeriod: number
  bbwMult: number
}

export const DEFAULT_INDICATOR_PARAMS: IndicatorParams = {
  // 主图
  maPeriods: [5, 10, 20],
  bollPeriod: 20,
  bollMult: 2,
  sarAfStart: 0.02,
  sarAfStep: 0.02,
  sarAfMax: 0.2,
  ichimokuTenkan: 9,
  ichimokuKijun: 26,
  ichimokuSpanB: 52,
  ichimokuDisplacement: 26,
  // 副图
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  kdjN: 9,
  kdjM1: 3,
  kdjM2: 3,
  rsiPeriod: 14,
  wrPeriod: 14,
  obvMaPeriod: 1, // 1 = 原始 OBV 不平滑；>1 时按 SMA 平滑
  atrPeriod: 14,
  dmiPeriod: 14,
  cciPeriod: 20,
  psyPeriod: 12,
  stochK: 14,
  stochSmooth: 3,
  stochD: 3,
  rocPeriod: 12,
  momPeriod: 10,
  bbwPeriod: 20,
  bbwMult: 2,
}
