export interface PriceRange {
  from: number
  to: number
}

/**
 * 双指捏合纵向缩放：以 midPrice（捏合中心价）为锚点缩放价格区间。
 * factor = 当前指距 / 初始指距；>1 为张开（放大 → 区间收窄），<1 为收拢（缩小 → 区间放宽）。
 * 中心价保持不变，上下边界按同一比例向中心靠拢/远离。
 */
export function zoomRangeAround(midPrice: number, from: number, to: number, factor: number): PriceRange {
  const newFrom = midPrice - (midPrice - from) / factor
  const newTo = midPrice + (to - midPrice) / factor
  return { from: newFrom, to: newTo }
}
