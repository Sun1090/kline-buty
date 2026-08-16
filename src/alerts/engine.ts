export interface PriceAlert {
  id: string
  symbol: string
  direction: 'above' | 'below'
  price: number
  /** 一次性触发标记（触发后不再重复） */
  triggered: boolean
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

export function createAlert(symbol: string, direction: 'above' | 'below', price: number): PriceAlert {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    direction,
    price,
    triggered: false,
  }
}

/** 已触发的提醒是否仍满足（用于显示"已触发"状态） */
export function isCurrentlyTrue(a: PriceAlert, currentPrice: number): boolean {
  return evaluateAlert(a, currentPrice)
}
