import { checkHit, type Position } from '../position/pnl'
import { effectiveStopLoss } from '../position/levels'
import type { Positions } from './positions'

export type TpSlSlot = 'long' | 'short'

/** 一次止盈/止损触发：平仓价即触达时的最新价（模拟盘按市价结算，不计滑点） */
export interface TpSlExit {
  symbol: string
  slot: TpSlSlot
  reason: 'takeProfit' | 'stopLoss'
  price: number
  entry: number
  qty: number
  direction: Position['direction']
  /** 命中的原持仓对象引用：调用方据此与显式平仓簿记共享去重 */
  source: Position
}

/** 移动止损推进了一步：symbol/slot 的止损线应写回为 stop */
export interface TrailMove {
  symbol: string
  slot: TpSlSlot
  stop: number
}

/** 价源：返回该品种最新价，无数据时返回 null（该品种本轮跳过） */
export type PriceOf = (symbol: string) => number | null

/**
 * 跨品种止盈/止损判定：任一品种持仓的最新价触达 TP/止损即产出一条平仓计划。
 * 品种按字典序遍历，输出顺序稳定（同一轮多条命中时记账/横幅可预期）。
 * 止损线取持仓上的存值——移动止损由 `planTrailMoves` 逐轮写回，判定本身不重算，
 * 因此产出的 source 仍是原持仓对象，上层「已结算」认领按对象身份生效。
 */
export function planTpSlExits(positions: Record<string, Positions>, priceOf: PriceOf): TpSlExit[] {
  const exits: TpSlExit[] = []
  for (const symbol of Object.keys(positions).sort()) {
    const price = priceOf(symbol)
    if (price == null || !Number.isFinite(price) || price <= 0) continue
    const slots = positions[symbol]
    for (const slot of ['long', 'short'] as const) {
      const p = slots[slot]
      if (!p) continue
      const reason = checkHit(p, price)
      if (!reason) continue
      exits.push({ symbol, slot, reason, price, entry: p.entry, qty: p.quantity, direction: p.direction, source: p })
    }
  }
  return exits
}

/**
 * 移动止损推进计划：逐品种算出新止损线，仅在与已存值不同时产出写回项。
 * 止损只朝有利方向移动（多头只升、空头只降），价格回落时不回撤。
 */
export function planTrailMoves(positions: Record<string, Positions>, priceOf: PriceOf): TrailMove[] {
  const moves: TrailMove[] = []
  for (const symbol of Object.keys(positions).sort()) {
    const price = priceOf(symbol)
    if (price == null || !Number.isFinite(price) || price <= 0) continue
    const slots = positions[symbol]
    for (const slot of ['long', 'short'] as const) {
      const p = slots[slot]
      if (!p) continue
      const stop = effectiveStopLoss(p, price)
      if (stop === undefined || stop === p.stopLoss) continue
      moves.push({ symbol, slot, stop })
    }
  }
  return moves
}
