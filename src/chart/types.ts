export type Period = '1s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1d' | '3d' | '1w' | '1M'

export const PERIODS: { value: Period; label: string }[] = [
  { value: '1s', label: '1秒' },
  { value: '1m', label: '1分' },
  { value: '3m', label: '3分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '30m', label: '30分' },
  { value: '1h', label: '1时' },
  { value: '2h', label: '2时' },
  { value: '4h', label: '4时' },
  { value: '12h', label: '12时' },
  { value: '1d', label: '日' },
  { value: '3d', label: '3日' },
  { value: '1w', label: '周' },
  { value: '1M', label: '月' },
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
