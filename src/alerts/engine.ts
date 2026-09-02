export interface PriceAlert {
  id: string
  symbol: string
  direction: 'above' | 'below'
  price: number
  /** 一次性触发标记（触发后不再重复） */
  triggered: boolean
  /** D10 循环模式：触发后价格回撤到阈值另一侧时自动重新武装，可重复触发 */
  repeat?: boolean
}

/** 条件是否满足 */
export function evaluateAlert(a: PriceAlert, currentPrice: number): boolean {
  if (a.direction === 'above') return currentPrice >= a.price
  return currentPrice <= a.price
}

/** 应触发（条件满足且未触发过） */
export function shouldTrigger(a: PriceAlert, currentPrice: number): boolean {
  return !a.triggered && evaluateAlert(a, currentPrice)
}

/**
 * D10 提醒状态推进（纯函数）：
 * - 未触发且条件满足 → 触发（triggered=true）；
 * - 循环模式（repeat）已触发且条件不再满足 → 重新武装（triggered=false）；
 * - 其余保持原样。
 */
export function stepAlert(a: PriceAlert, currentPrice: number): PriceAlert {
  if (shouldTrigger(a, currentPrice)) return { ...a, triggered: true }
  if (a.repeat && a.triggered && !evaluateAlert(a, currentPrice)) return { ...a, triggered: false }
  return a
}

export function createAlert(symbol: string, direction: 'above' | 'below', price: number, repeat = false): PriceAlert {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    direction,
    price,
    triggered: false,
    repeat,
  }
}

/** 已触发的提醒是否仍满足（用于显示"已触发"状态） */
export function isCurrentlyTrue(a: PriceAlert, currentPrice: number): boolean {
  return evaluateAlert(a, currentPrice)
}
