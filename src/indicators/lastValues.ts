import type { ValuePoint } from './sma'

/** H9 指标值表条目：线名 + 末尾值（无值时省略） */
export interface IndicatorLastValue {
  id: string
  value: number
}

/** 取一组线各自的最后一点（时间最新者）；无 data / 空线 → 空数组 */
export function lastValuesOfLines(lines: { id: string; points: ValuePoint[] }[]): IndicatorLastValue[] {
  const out: IndicatorLastValue[] = []
  for (const l of lines) {
    const last = l.points[l.points.length - 1]
    if (last !== undefined) out.push({ id: l.id, value: last.value })
  }
  return out
}

/** 取柱状图最后一点（MACD/VOL 等），无 data → null */
export function lastHistValue(hist: { time: number; value: number }[] | undefined): number | null {
  const last = hist && hist.length > 0 ? hist[hist.length - 1] : null
  return last ? last.value : null
}