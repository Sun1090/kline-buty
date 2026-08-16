import { suggestLevels, type Position } from '../position/pnl'

export type OrderSide = 'buy' | 'sell'

export interface OrderEstimate {
  /** 名义金额 = price × qty */
  notional: number
  /** 手续费 = notional × 费率 */
  fee: number
  /** 合计 = notional + fee */
  total: number
}

/** 模拟吃单费率（币安现货 0.1%） */
export const TAKER_FEE_RATE = 0.001

/** 估算下单金额（纯函数）：名义金额 / 手续费 / 合计 */
export function estimateOrder(price: number, qty: number): OrderEstimate {
  const notional = price * qty
  const fee = notional * TAKER_FEE_RATE
  return { notional, fee, total: notional + fee }
}

/** 快速下单 → 模拟仓位：买=做多、卖=做空，止盈/止损参考百分比自动生成 */
export function buildPositionFromOrder(
  side: OrderSide,
  price: number,
  qty: number,
  tpPct = 3,
  slPct = 2,
): Position {
  const direction = side === 'buy' ? 'long' : 'short'
  const levels = suggestLevels(price, direction, tpPct, slPct)
  return {
    entry: price,
    quantity: qty,
    direction,
    takeProfit: levels.takeProfit,
    stopLoss: levels.stopLoss,
  }
}
