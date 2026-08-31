import type { Candle } from '../chart/types'

export interface DonchianPoint {
  time: number
  upper: number
  lower: number
  middle: number
}

/**
 * 唐奇安通道（Donchian Channel, n）：突破系统最常用的通道指标。
 *
 * 上轨 = 最近 n 期最高价 HHV(high,n)；下轨 = 最近 n 期最低价 LLV(low,n)；
 * 中轨 = (上轨+下轨)/2。价格突破上轨视为上升趋势信号，跌破下轨为下降趋势。
 */
export function calcDonchian(candles: Candle[], n = 20): DonchianPoint[] {
  const out: DonchianPoint[] = []
  if (candles.length === 0) return out
  let hh = -Infinity
  let ll = Infinity
  const hWin: number[] = []
  const lWin: number[] = []
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    hWin.push(c.high)
    lWin.push(c.low)
    hh = Math.max(hh, c.high)
    ll = Math.min(ll, c.low)
    if (i >= n) {
      // 窗口滑出：从露出窗口的最小高/最大低查起（O(n) 兜底，数据量小可接受）
      const droppedH = hWin.shift() ?? 0
      const droppedL = lWin.shift() ?? 0
      if (droppedH === hh) {
        let max = -Infinity
        for (const h of hWin) max = Math.max(max, h)
        hh = max
      }
      if (droppedL === ll) {
        let min = Infinity
        for (const l of lWin) min = Math.min(min, l)
        ll = min
      }
    }
    if (i >= n - 1) {
      out.push({ time: c.time, upper: hh, lower: ll, middle: (hh + ll) / 2 })
    }
  }
  return out
}