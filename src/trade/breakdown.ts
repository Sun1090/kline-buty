import type { TradeRecord } from '../hooks/usePaperAccount'

/**
 * v0.5 按品种盈亏汇总（纯函数）：把成交流水按 symbol 聚合，
 * 输出笔数 / 已平仓数 / 净盈亏 / 胜率，按净盈亏降序。
 */

export interface SymbolBreakdown {
  symbol: string
  /** 总流水笔数（开仓+平仓） */
  count: number
  /** 已平仓笔数 */
  closed: number
  /** 净已实现盈亏（USDT，平仓 pnl 合计） */
  pnl: number
  wins: number
  losses: number
  /** 胜率（0–1；无平仓 → 0） */
  winRate: number
}

/** 按品种汇总流水（新在前 → 时间无关，仅聚合）；空流水 → 空数组。 */
export function symbolBreakdown(trades: TradeRecord[]): SymbolBreakdown[] {
  const map = new Map<string, SymbolBreakdown>()
  for (const t of trades) {
    let b = map.get(t.symbol)
    if (!b) {
      b = { symbol: t.symbol, count: 0, closed: 0, pnl: 0, wins: 0, losses: 0, winRate: 0 }
      map.set(t.symbol, b)
    }
    b.count++
    if (t.kind === 'close' && t.pnl !== undefined) {
      b.closed++
      b.pnl += t.pnl
      if (t.pnl > 0) b.wins++
      else if (t.pnl < 0) b.losses++
    }
  }
  const out = [...map.values()]
  for (const b of out) b.winRate = b.closed === 0 ? 0 : b.wins / b.closed
  return out.sort((a, b) => b.pnl - a.pnl)
}
