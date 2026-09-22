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

/** 新开仓的参考止盈/止损百分比（没有随单价位时的兜底，改默认值只需改这里） */
export const DEFAULT_TP_PCT = 3
export const DEFAULT_SL_PCT = 2

/** 方向对应槽位 key */
export function slotFor(side: OrderSide): 'long' | 'short' {
  return side === 'buy' ? 'long' : 'short'
}

/** 反方向槽位 key */
export function oppositeSlot(slot: 'long' | 'short'): 'long' | 'short' {
  return slot === 'long' ? 'short' : 'long'
}

/**
 * 同方向合并：数量相加、开仓价按数量加权，价位线（止盈/止损/移动止损）与杠杆沿用既有持仓——
 * 那几条线是用户行内编辑或图上拖出来的，加一注不该把它们重置回表单默认值。
 * 无既有持仓则原样收下新仓。
 */
export function mergePosition(existing: Position | null | undefined, opened: Position): Position {
  if (!existing) return opened
  const quantity = existing.quantity + opened.quantity
  const entry = (existing.entry * existing.quantity + opened.entry * opened.quantity) / quantity
  return { ...existing, entry, quantity }
}

/**
 * J1 开仓/加仓（hedge mode）：只影响对应方向槽位。
 * 已有同方向持仓 → 加权合并；无持仓 → 新建并按百分比参考价给止盈/止损。
 * `attach`（限价单随单价位）只在开出新槽位时顶掉参考价；加仓沿用用户既有价位线，
 * 随单不该把它们重置掉（同 `mergePosition` 的口径）。
 */
export function applyOrder(
  positions: Positions,
  side: OrderSide,
  price: number,
  qty: number,
  tpPct = DEFAULT_TP_PCT,
  slPct = DEFAULT_SL_PCT,
  attach?: { takeProfit: number | null; stopLoss: number | null } | null,
): Positions {
  const slot = slotFor(side)
  const existing = positions[slot]
  if (!existing) {
    const direction = side === 'buy' ? 'long' : 'short'
    const levels = suggestLevels(price, direction, tpPct, slPct)
    return {
      ...positions,
      [slot]: {
        entry: price,
        quantity: qty,
        direction,
        takeProfit: attach?.takeProfit ?? levels.takeProfit,
        stopLoss: attach?.stopLoss ?? levels.stopLoss,
      },
    }
  }
  return { ...positions, [slot]: mergePosition(existing, { ...existing, entry: price, quantity: qty }) }
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

/**
 * v0.5.x 反手：平掉指定方向持仓，并以现价同量开反向仓。
 * 已开反向槽位存在时按 applyOrder 加权合并（不覆盖）。平掉的旧持仓
 * 返回给调用方记账（pnl/手续费）；不修改入参。
 */
export function reverseSlot(
  positions: Positions,
  slot: 'long' | 'short',
  price: number,
  tpPct = DEFAULT_TP_PCT,
  slPct = DEFAULT_SL_PCT,
): { next: Positions; closed: Position | null } {
  const closed = positions[slot]
  if (!closed) return { next: positions, closed: null }
  const side: OrderSide = slot === 'long' ? 'sell' : 'buy'
  // 先平旧方向槽位，再同量开反向仓（applyOrder 会加权合并已有的反向持仓）
  const next = applyOrder({ ...positions, [slot]: null }, side, price, closed.quantity, tpPct, slPct)
  return { next, closed }
}

/**
 * 部分平仓计划：从持仓中减掉 qty，返回减仓量与剩余持仓（减到 0 则槽位清空为 null）。
 * qty 非法（非有限数 / ≤0）或超过持仓量时返回 null，由调用方提示而不是静默改数量。
 * 剩余持仓沿用开仓价与止盈/止损/移动止损设置——减仓不动这些线。
 */
export function planReduce(
  p: Position,
  qty: number,
): { qty: number; remaining: Position | null } | null {
  if (!Number.isFinite(qty) || qty <= 0) return null
  // 按比例算出的浮点尘不应被当成「超过持仓量」
  if (qty > p.quantity + 1e-9) return null
  const closed = Number(Math.min(qty, p.quantity).toPrecision(12))
  const left = p.quantity - closed
  if (left <= 1e-9) return { qty: closed, remaining: null }
  return { qty: closed, remaining: { ...p, quantity: Number(left.toPrecision(12)) } }
}

/** 是否有任一方向持仓 */
export function hasAny(positions: Positions): boolean {
  return positions.long !== null || positions.short !== null
}

/** 汇总名义持仓数量（多空相加；仅统计用） */
export function totalQuantity(positions: Positions): number {
  return (positions.long?.quantity ?? 0) + (positions.short?.quantity ?? 0)
}

