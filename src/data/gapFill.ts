import type { Period } from '../chart/types'
import { alignTimeToPeriod, periodSpanMs } from './align'

/**
 * G7 断线分段补洞：把「断线期间缺失的时间区间」切分为若干页，供逐段 REST 回补。
 *
 * 断线后本地已有数据止于 lastTimeSec；A1 起点先对齐周期边界（防自定义源/缓存
 * 传入非对齐时间戳导致游标错位）；从该时刻补到 nowSec。
 * 以 PAGE_SIZE 根为一页（页宽 1M 用 31 天上界），返回毫秒级 startTime/endTime 游标序列（升序、首尾相接）。
 *
 * 返回 []：无需回补（now ≤ last，时钟回拨或断线未丢数据）。
 */
export const GAP_PAGE_SIZE = 500
/** 单次补洞最多页数（防止极端长断线无限拉取，覆盖后自动停） */
export const GAP_MAX_PAGES = 20

export function gapFillRanges(
  lastTimeSec: number,
  nowSec: number,
  period: Period,
  pageSize = GAP_PAGE_SIZE,
  maxPages = GAP_MAX_PAGES,
): { startTime: number; endTime: number }[] {
  if (!Number.isFinite(lastTimeSec) || !Number.isFinite(nowSec) || nowSec <= lastTimeSec) return []
  const startMs = alignTimeToPeriod(lastTimeSec, period) * 1000
  const endMs = nowSec * 1000
  const pageMs = periodSpanMs(period, pageSize)
  const ranges: { startTime: number; endTime: number }[] = []
  let s = startMs
  let pages = 0
  while (s < endMs && pages < maxPages) {
    const e = Math.min(s + pageMs, endMs)
    ranges.push({ startTime: s, endTime: e })
    s = e
    pages++
  }
  return ranges
}
