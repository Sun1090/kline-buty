import type { Position } from './pnl'

/** 行内编辑输入：以字符串承载，空串明确表示「清除该线」 */
export interface LevelInput {
  takeProfit: string
  stopLoss: string
  /** 移动止损百分比；空串表示关闭。未提供该字段时保持原值 */
  trail?: string
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

/** 解析移动止损百分比：空白 → null（关闭）；不在 (0, 100] 内 → undefined（非法） */
export function parseTrail(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : undefined
}

/** 校验两条线的相对关系：多头止盈需高于止损，空头反之 */
export function levelsOrdered(direction: Position['direction'], tp: number, sl: number): boolean {
  return direction === 'long' ? tp > sl : tp < sl
}

/** 该方向上止盈/止损允许的价格边界：止盈卡在开仓价，止损卡在「开仓价与现价中的较有利者」 */
function levelBounds(direction: Position['direction'], entry: number, currentPrice?: number | null) {
  return direction === 'long'
    ? { tpOk: (v: number) => v >= entry, slOk: (v: number) => v <= Math.max(entry, currentPrice ?? entry) }
    : { tpOk: (v: number) => v <= entry, slOk: (v: number) => v >= Math.min(entry, currentPrice ?? entry) }
}

/** 应用编辑：逐条解析校验，返回新持仓或错误码（不改入参） */
export function applyLevels(p: Position, input: LevelInput, currentPrice?: number | null): LevelResult {
  const tp = parseLevel(input.takeProfit)
  const sl = parseLevel(input.stopLoss)
  const trail = input.trail === undefined ? p.trailPct ?? null : parseTrail(input.trail)
  if (tp === undefined || sl === undefined || (input.trail !== undefined && trail === undefined)) {
    return { ok: false, error: 'invalid' }
  }
  const next: Position = { ...p }
  if (tp === null) delete next.takeProfit
  else next.takeProfit = tp
  if (sl === null) delete next.stopLoss
  else next.stopLoss = sl
  if (trail === null) delete next.trailPct
  else next.trailPct = trail

  const { tpOk, slOk } = levelBounds(p.direction, p.entry, currentPrice)
  if (next.takeProfit !== undefined && !tpOk(next.takeProfit)) return { ok: false, error: 'invalid' }
  if (next.stopLoss !== undefined && !slOk(next.stopLoss)) return { ok: false, error: 'invalid' }
  if (next.takeProfit !== undefined && next.stopLoss !== undefined && !levelsOrdered(p.direction, next.takeProfit, next.stopLoss)) {
    return { ok: false, error: 'crossed' }
  }
  return { ok: true, position: next }
}

/** 一键保本止损：把止损推到开仓价（浮盈归零位），保留止盈 */
export function breakevenStop(p: Position): Position {
  return { ...p, stopLoss: p.entry }
}

/**
 * 移动止损的有效止损价：多头取「已设止损」与「现价 ×(1−t%)」的较高者，空头取较低者。
 * 未设 t 或价格非法时原样返回已设止损——因此它既是判定用的止损线，也是写回值（只朝有利方向推进）。
 */
export function effectiveStopLoss(p: Position, price: number | null): number | undefined {
  if (p.trailPct == null || price == null || !Number.isFinite(price) || price <= 0) return p.stopLoss
  const ratio = p.trailPct / 100
  const candidate = p.direction === 'long' ? price * (1 - ratio) : price * (1 + ratio)
  if (p.stopLoss === undefined) return candidate
  return p.direction === 'long' ? Math.max(p.stopLoss, candidate) : Math.min(p.stopLoss, candidate)
}
