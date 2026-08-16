export interface Position {
  entry: number
  quantity: number
  direction: 'long' | 'short'
  takeProfit?: number
  stopLoss?: number
}

export interface PnlResult {
  pnl: number
  pnlPct: number
}

/** 浮动盈亏：多头 (price-entry)×qty，空头 (entry-price)×qty */
export function calcPnl(p: Position, price: number): PnlResult {
  const dir = p.direction === 'long' ? 1 : -1
  const pnl = (price - p.entry) * p.quantity * dir
  const pnlPct = p.entry === 0 ? 0 : ((price - p.entry) / p.entry) * 100 * dir
  return { pnl, pnlPct }
}

/** 依据入场价与方向给出止盈/止损参考价 */
export function suggestLevels(
  entry: number,
  direction: 'long' | 'short',
  tpPct: number,
  slPct: number,
): { takeProfit: number; stopLoss: number } {
  const dir = direction === 'long' ? 1 : -1
  return {
    takeProfit: entry * (1 + (dir * tpPct) / 100),
    stopLoss: entry * (1 - (dir * slPct) / 100),
  }
}

/** 价格是否已触达止盈/止损 */
export function checkHit(p: Position, price: number): 'takeProfit' | 'stopLoss' | null {
  if (p.direction === 'long') {
    if (p.takeProfit !== undefined && price >= p.takeProfit) return 'takeProfit'
    if (p.stopLoss !== undefined && price <= p.stopLoss) return 'stopLoss'
  } else {
    if (p.takeProfit !== undefined && price <= p.takeProfit) return 'takeProfit'
    if (p.stopLoss !== undefined && price >= p.stopLoss) return 'stopLoss'
  }
  return null
}
