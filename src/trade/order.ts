import { suggestLevels, type Position } from '../position/pnl'

export type OrderSide = 'buy' | 'sell'

export interface OrderEstimate {
  /** 名义金额 = price × qty */
  notional: number
  /** 模拟等价成交价 = price × (1 − 滑点)（买盘正向滑点抬价、卖盘负向） */
  fillPrice: number
  /** 手续费 = fillPrice × qty × 费率 */
  fee: number
  /** 合计 = fillPrice × qty + fee（按滑点后成交价计手续费） */
  total: number
}

/** 模拟吃单费率（币安现货 0.1%） */
export const TAKER_FEE_RATE = 0.001
/** 模拟盘口滑点偏移（0.02%）：市价单相对最新价的深度成本近似。 */
export const DEFAULT_SLIPPAGE_RATIO = 0.0002

/**
 * 估算下单（纯函数）：名义金额 / 滑点成交价 / 手续费 / 合计。
 * 买盘（buy）：fillPrice = price×(1+滑点)（对手方被迫吃更高价）；
 * 卖盘（sell）：fillPrice = price×(1−滑点）。默认不滑点（slippageRatio=0，
 * 保持既有 pure 契约；UI 层调用时按需传 DEFAULT_SLIPPAGE_RATIO）。
 */
export function estimateOrder(price: number, qty: number, side: OrderSide = 'buy', slippageRatio = 0): OrderEstimate {
  const dir = side === 'buy' ? 1 : -1
  const fillPrice = price * (1 + dir * slippageRatio)
  const notional = fillPrice * qty
  const fee = notional * TAKER_FEE_RATE
  return { notional, fillPrice, fee, total: notional + fee }
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

/**
 * D6 持仓成本加权合并（加仓/减仓）。
 * - 同方向加仓：new entry = 加权平均成交价，quantity 相加
 * - 反方向下单：净减仓（quantity 相减）；若反手量超过原仓，生成反向新仓（entry 为新单价格，
 *   剩余量 = 超出的部分），TP/SL 参考新价格档
 * - 减至恰好平仓 → 返回 null（由调用方触发平仓结算）
 */
export function mergePosition(
  existing: Position,
  side: OrderSide,
  price: number,
  qty: number,
  tpPct = 3,
  slPct = 2,
): Position | null {
  const buy = side === 'buy'
  const sameDir = (existing.direction === 'long') === buy
  if (sameDir) {
    const newQty = existing.quantity + qty
    const newEntry =
      newQty <= 0 ? price : (existing.entry * existing.quantity + price * qty) / newQty
    const levels = suggestLevels(newEntry, existing.direction, tpPct, slPct)
    return { ...existing, entry: newEntry, quantity: newQty, takeProfit: levels.takeProfit, stopLoss: levels.stopLoss }
  }
  const remain = existing.quantity - qty
  if (remain === 0) return null
  if (remain > 0) return { ...existing, quantity: remain }
  // 反手：超出部分形成反向仓
  const dir = existing.direction === 'long' ? 'short' : 'long'
  const levels = suggestLevels(price, dir, tpPct, slPct)
  return { entry: price, quantity: -remain, direction: dir, takeProfit: levels.takeProfit, stopLoss: levels.stopLoss }
}
