/**
 * G15 数据量自适应（降采样）：当蜡烛数量超过目标时按等间距抽样保留 target 根，
 * 保持时间顺序、覆盖全区间、始终保留最后一根（最新行情不失真）。
 * 纯函数：输入任意带 time 的数组，输出抽样后的新数组（不修改入参）。
 */
export function downsampleCandles<T extends { time: number }>(candles: T[], target: number): T[] {
  if (target <= 0 || candles.length <= target) return candles
  const step = candles.length / target
  const out: T[] = []
  for (let i = 0; i < target - 1; i++) {
    out.push(candles[Math.min(candles.length - 1, Math.floor(i * step))])
  }
  // 恒保留最后一根
  out.push(candles[candles.length - 1])
  return out
}
