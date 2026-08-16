import type { DepthPoint } from './aggregate'

/** 数量/金额紧凑格式化：1.23K / 4.5M，<1000 保留 0-2 位小数 */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  const trim = (x: number) => parseFloat(x.toFixed(2)).toString()
  if (abs >= 1e6) return `${trim(n / 1e6)}M`
  if (abs >= 1e3) return `${trim(n / 1e3)}K`
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 10) return n.toFixed(1)
  return trim(n)
}

/** 买/卖两侧累计总量（取各侧累计最大值） */
export function sideTotals(points: DepthPoint[]): { bidTotal: number; askTotal: number } {
  let bidTotal = 0
  let askTotal = 0
  for (const p of points) {
    if (p.side === 'bid') bidTotal = Math.max(bidTotal, p.total)
    else askTotal = Math.max(askTotal, p.total)
  }
  return { bidTotal, askTotal }
}

/** 最优买卖价差（非负） */
export function spreadOf(bestBid: number, bestAsk: number): number {
  return Math.max(0, bestAsk - bestBid)
}

export interface DepthHoverInfo {
  /** 光标所在价格 */
  price: number
  /** 该价格下买盘累计量（买档 price ≥ p 的最近档累计；p 高于全部买档为 0） */
  bidTotal: number
  /** 该价格下卖盘累计量（卖档 price ≤ p 的最近档累计；p 低于全部卖档为 0） */
  askTotal: number
  /** 是否恰为档位价 */
  exact: boolean
}

/** 深度图 hover：给定聚合点集与任意价格，返回该价位的买卖累计明细。
 * 语义与深度曲线一致：买累计 = 买档 price ≥ p 的最近档累计（向下累计），
 * 卖累计 = 卖档 price ≤ p 的最近档累计（向上累计）。 */
export function depthHoverInfo(points: DepthPoint[], price: number): DepthHoverInfo | null {
  if (!Number.isFinite(price) || points.length === 0) return null
  let bestBidPt: DepthPoint | null = null
  let bestAskPt: DepthPoint | null = null
  let exact = false
  for (const p of points) {
    if (p.side === 'bid' && p.price >= price && (!bestBidPt || p.price < bestBidPt.price)) {
      bestBidPt = p
    }
    if (p.side === 'ask' && p.price <= price && (!bestAskPt || p.price > bestAskPt.price)) {
      bestAskPt = p
    }
    if (p.price === price) exact = true
  }
  return {
    price,
    bidTotal: bestBidPt ? bestBidPt.total : 0,
    askTotal: bestAskPt ? bestAskPt.total : 0,
    exact,
  }
}
