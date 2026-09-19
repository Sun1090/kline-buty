import type { Candle } from '../chart/types'

/**
 * v0.5.x 流水定位图表（纯函数）：以成交时刻为中心，取其前后各 span 根 K 线的时间范围，
 * 供 ChartView.externalRange 设置可视范围。时间单位与 K 线一致（秒），越界钳制。
 */

/** 定位范围（K 线秒单位时间，传给图表 visible range） */
export function locateRangeFor(
  candles: Candle[],
  atSec: number,
  span = 20,
): { from: number; to: number } | null {
  if (candles.length === 0) return null
  // 找到 atSec 所在或之前最近的 K 线下标
  let idx = 0
  for (let i = 0; i < candles.length; i++) {
    if (candles[i].time <= atSec) idx = i
    else break
  }
  const from = Math.max(0, idx - span)
  const to = Math.min(candles.length - 1, idx + span)
  return { from: candles[from].time, to: candles[to].time }
}