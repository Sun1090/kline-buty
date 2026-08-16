export type Period = '1s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1d' | '3d' | '1w' | '1M'

export const PERIODS: { value: Period; labelKey: string }[] = [
  { value: '1s', labelKey: 'period.1s' },
  { value: '1m', labelKey: 'period.1m' },
  { value: '3m', labelKey: 'period.3m' },
  { value: '5m', labelKey: 'period.5m' },
  { value: '15m', labelKey: 'period.15m' },
  { value: '30m', labelKey: 'period.30m' },
  { value: '1h', labelKey: 'period.1h' },
  { value: '2h', labelKey: 'period.2h' },
  { value: '4h', labelKey: 'period.4h' },
  { value: '12h', labelKey: 'period.12h' },
  { value: '1d', labelKey: 'period.1d' },
  { value: '3d', labelKey: 'period.3d' },
  { value: '1w', labelKey: 'period.1w' },
  { value: '1M', labelKey: 'period.1M' },
]

/** 周期 → 毫秒（分页游标计算用） */
export const PERIOD_MS: Record<Period, number> = {
  '1s': 1_000,
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '3d': 259_200_000,
  '1w': 604_800_000,
  '1M': 2_592_000_000,
}

export interface Candle {
  /** 秒级 UTC 时间戳（K 线开盘时间） */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  /** 该 K 线是否已收盘 */
  isClosed: boolean
}
