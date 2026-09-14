import type { TradeRecord } from '../hooks/usePaperAccount'

/** v0.5 交易流水过滤：按品种 / 方向 / 关键词过滤成交流水（纯函数）。 */
export interface TradeFilter {
  /** 品种（空 = 全部） */
  symbol?: string
  /** 方向（buy=做多 / sell=做空；空 = 全部） */
  side?: 'buy' | 'sell'
  /** 关键词（匹配品种子串或价格文本） */
  query?: string
}

/** 过滤成交流水；无过滤条件时原样返回（不产生新数组引用）。 */
export function filterTrades(trades: TradeRecord[], f: TradeFilter): TradeRecord[] {
  const q = f.query?.trim().toLowerCase() ?? ''
  const hasQ = q.length > 0
  const hasSymbol = f.symbol !== undefined && f.symbol !== ''
  const hasSide = f.side !== undefined
  if (!hasQ && !hasSymbol && !hasSide) return trades
  return trades.filter((t) => {
    if (hasSymbol && t.symbol !== f.symbol) return false
    if (hasSide && t.side !== f.side) return false
    if (hasQ && !t.symbol.toLowerCase().includes(q) && !String(t.price).toLowerCase().includes(q)) return false
    return true
  })
}

/** 流水去重品种列表（保持首次出现顺序）。 */
export function tradeSymbols(trades: TradeRecord[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of trades) {
    if (!seen.has(t.symbol)) {
      seen.add(t.symbol)
      out.push(t.symbol)
    }
  }
  return out
}
