export type PositionLineKey = 'entry' | 'takeProfit' | 'stopLoss'

export interface PositionLineInfo {
  key: PositionLineKey
  price: number
}

const HOVER_THRESHOLD_PX = 8

/**
 * 拖拽状态机纯逻辑：
 * - detectHover：指针是否接近某条价格线（命中返回 key）
 * - resolveDragPrice：拖动时指针 y → 价格
 */
export function detectHover(
  pointerY: number,
  lines: PositionLineInfo[],
  priceToY: (price: number) => number | null,
): PositionLineKey | null {
  let best: PositionLineKey | null = null
  let bestDist = Infinity
  for (const l of lines) {
    const y = priceToY(l.price)
    if (y === null) continue
    const dist = Math.abs(pointerY - y)
    if (dist < HOVER_THRESHOLD_PX && dist < bestDist) {
      bestDist = dist
      best = l.key
    }
  }
  return best
}

/** 拖拽时指针 y 坐标 → 价格（无效/非正数返回 null） */
export function resolveDragPrice(
  pointerY: number,
  yToPrice: (y: number) => number | null,
): number | null {
  const price = yToPrice(pointerY)
  if (price === null || !Number.isFinite(price) || price <= 0) return null
  return price
}
