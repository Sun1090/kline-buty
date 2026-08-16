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
