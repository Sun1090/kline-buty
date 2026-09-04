import { suggestLevels, type Position } from '../position/pnl'
import type { OrderSide } from './order'

/**
 * J1 模拟账户双向持仓（hedge mode）：同一品种多空并存。
 *
 * 容器：`{ long: Position | null; short: Position | null }`。
 * buy 单只影响 long 槽，sell 单只影响 short 槽——多空各自独立加仓合并，
 * 互不抵消。平仓需用户显式结算对应方向（settleSlot）。
 * 纯函数：所有变换返回新容器，不修改入参，便于单测。
 */

export interface Positions {
  long: Position | null
  short: Position | null
}

export const EMPTY_POSITIONS: Positions = { long: null, short: null }

/** 方向对应槽位 key */
export function slotFor(side: OrderSide): 'long' | 'short' {
  return side === 'buy' ? 'long' : 'short'
}

/** 反方向槽位 key */
export function oppositeSlot(slot: 'long' | 'short'): 'long' | 'short' {
  return slot === 'long' ? 'short' : 'long'
}

/**
 * J1 开仓/加仓（hedge mode）：只影响对应方向槽位。
 * 已有同方向持仓 → 加权合并；无持仓 → 新建。
 */
export function applyOrder(
  positions: Positions,
  side: OrderSide,
  price: number,
  qty: number,
  tpPct = 3,
  slPct = 2,
): Positions {
  const slot = slotFor(side)
  const existing = positions[slot]
  if (!existing) {
    const direction = side === 'buy' ? 'long' : 'short'
    const levels = suggestLevels(price, direction, tpPct, slPct)
    return { ...positions, [slot]: { entry: price, quantity: qty, direction, takeProfit: levels.takeProfit, stopLoss: levels.stopLoss } }
  }
  // 同方向加权合并
  const newQty = existing.quantity + qty
  const newEntry = (existing.entry * existing.quantity + price * qty) / newQty
  const levels = suggestLevels(newEntry, existing.direction, tpPct, slPct)
  return { ...positions, [slot]: { ...existing, entry: newEntry, quantity: newQty, takeProfit: levels.takeProfit, stopLoss: levels.stopLoss } }
}

/**
 * J1 结算某方向持仓（平仓/TP/SL 触发）。返回结算信息 + 新容器。
 * pnl 由调用方用 calcPnl 计算后传入；结算后对应槽位置 null。
 */
export function settleSlot(
  positions: Positions,
  slot: 'long' | 'short',
): { next: Positions; settled: Position | null } {
  const p = positions[slot]
  if (!p) return { next: positions, settled: null }
  return { next: { ...positions, [slot]: null }, settled: p }
}

/** 是否有任一方向持仓 */
export function hasAny(positions: Positions): boolean {
  return positions.long !== null || positions.short !== null
}

/** 汇总名义持仓数量（多空相加；仅统计用） */
export function totalQuantity(positions: Positions): number {
  return (positions.long?.quantity ?? 0) + (positions.short?.quantity ?? 0)
}

