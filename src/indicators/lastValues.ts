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

/**
 * B1 十字光标取值：取一组线在**指定时刻**的值（点时间戳精确匹配，光标 snap 到 K 线边界）。
 * 该时刻无线值（指标预热期）→ 省略该线；无 data / 空线 → 空数组。
 */
export function valuesAtTime(lines: { id: string; points: ValuePoint[] }[], time: number): IndicatorLastValue[] {
  const out: IndicatorLastValue[] = []
  for (const l of lines) {
    // 点按时间升序 → 二分找 first >= time；插入点即精确命中的位置
    let lo = 0
    let hi = l.points.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (l.points[mid].time < time) lo = mid + 1
      else hi = mid
    }
    const hit = l.points[lo]
    if (hit !== undefined && hit.time === time) out.push({ id: l.id, value: hit.value })
  }
  return out
}

/** B1 十字光标取值：柱状图（MACD/VOL 等）在指定时刻的值；无命中 → null */
export function histValueAtTime(hist: { time: number; value: number }[] | undefined, time: number): number | null {
  if (!hist || hist.length === 0) return null
  let lo = 0
  let hi = hist.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (hist[mid].time < time) lo = mid + 1
    else hi = mid
  }
  return hist[lo].time === time ? hist[lo].value : null
}