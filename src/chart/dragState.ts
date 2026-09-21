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

/**
 * 本次拖动的落点价格：由 UI 层（持仓校验）决定。
 * - accepted 为 null：本次移动不合法 → 线停在原位；
 * - accepted 为有限正数：按夹紧后的价格落线；
 * - 未返回（void/undefined）或返回非法值：原样沿用指针价（如拖开仓价）。
 */
export function acceptDragPrice(raw: number, accepted: number | null | void): number | null {
  if (accepted === null) return null
  if (accepted === undefined) return raw
  return Number.isFinite(accepted) && accepted > 0 ? accepted : raw
}
