/**
 * I6 波动率估计：最近 N 根蜡烛的 ATR%（平均真实波幅 / 收盘价的百分比）。
 * 用于提醒阈值的波动率自适应（adaptiveThreshold 的 atrPct 输入）。
 * 纯函数：不修改入参。
 */
export function atrPercent(
  candles: { high: number; low: number; close: number }[],
  period = 14,
): number {
  if (candles.length === 0) return 0
  const n = Math.min(period, candles.length)
  const slice = candles.slice(-n)
  let sum = 0
  for (const c of slice) {
    if (c.close > 0) sum += (c.high - c.low) / c.close
  }
  return (sum / slice.length) * 100
}
