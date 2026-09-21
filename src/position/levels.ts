import type { Position } from './pnl'

/** 行内编辑输入：以字符串承载，空串明确表示「清除该线」 */
export interface LevelInput {
  takeProfit: string
  stopLoss: string
}

export type LevelError = 'invalid' | 'crossed'

export type LevelResult = { ok: true; position: Position } | { ok: false; error: LevelError }

/** 解析单条价位：空白 → null（清除）；非正数或非有限数 → undefined（非法） */
export function parseLevel(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * 止盈/止损需落在持仓的合理一侧：多头止盈 ≥ 开仓价 ≥ 止损，空头相反。
 * 允许等于开仓价（保本止损）。
 */
export function levelsOnCorrectSide(direction: Position['direction'], entry: number, tp: number, sl: number): boolean {
  return direction === 'long' ? tp >= entry && sl <= entry : tp <= entry && sl >= entry
}

/** 校验两条线的相对关系：多头止盈需高于止损，空头反之 */
export function levelsOrdered(direction: Position['direction'], tp: number, sl: number): boolean {
  return direction === 'long' ? tp > sl : tp < sl
}

/** 应用编辑：先解析再校验，返回新持仓或错误码（不改入参） */
export function applyLevels(p: Position, input: LevelInput): LevelResult {
  const tp = parseLevel(input.takeProfit)
  const sl = parseLevel(input.stopLoss)
  if (tp === undefined || sl === undefined) return { ok: false, error: 'invalid' }
  const next: Position = { ...p }
  if (tp === null) delete next.takeProfit
  else next.takeProfit = tp
  if (sl === null) delete next.stopLoss
  else next.stopLoss = sl
  if (next.takeProfit !== undefined && next.stopLoss !== undefined) {
    if (!levelsOnCorrectSide(p.direction, p.entry, next.takeProfit, next.stopLoss)) return { ok: false, error: 'invalid' }
    if (!levelsOrdered(p.direction, next.takeProfit, next.stopLoss)) return { ok: false, error: 'crossed' }
  }
  return { ok: true, position: next }
}

/** 一键保本止损：把止损推到开仓价（浮盈归零位），保留止盈 */
export function breakevenStop(p: Position): Position {
  return { ...p, stopLoss: p.entry }
}
