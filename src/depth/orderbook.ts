import type { DepthSnapshot } from '../hooks/useDepth'

export interface OrderBookRow {
  price: number
  quantity: number
  cumulative: number
  /** 累计量占全量最大值的比例（0-1），用于背景比例条宽度 */
  pct: number
}

export interface OrderBookData {
  /** 从最低卖价（卖一）向外 */
  asks: OrderBookRow[]
  /** 从最高买价（买一）向外 */
  bids: OrderBookRow[]
  /** 买一卖一价差（非负） */
  spread: number
  /** 两侧累计量最大值（比例条基准） */
  maxTotal: number
}

/** 按价格宽度聚合档位：bucket = floor(price / groupSize) * groupSize，同桶量合并。
 * groupSize <= 0 时原样返回排序结果。 */
function groupLevels(rows: { price: number; quantity: number }[], groupSize: number, ascending: boolean) {
  const sorted = ascending
    ? [...rows].sort((a, b) => a.price - b.price)
    : [...rows].sort((a, b) => b.price - a.price)
  if (groupSize <= 0) return sorted
  const merged = new Map<number, { price: number; quantity: number }>()
  for (const r of sorted) {
    const bucket = Math.floor(r.price / groupSize) * groupSize
    const found = merged.get(bucket)
    if (found) found.quantity += r.quantity
    else merged.set(bucket, { price: bucket, quantity: r.quantity })
  }
  return [...merged.values()].sort((a, b) => (ascending ? a.price - b.price : b.price - a.price))
}

/** 盘口订单簿：两侧各取前 limit 档，按价格从最优价向外排列，附带累计量与占比。
 * groupSize > 0 时按价格宽度聚合档位（盘口精度切换）。 */
export function orderBookRows(snapshot: DepthSnapshot, limit = 8, groupSize = 0): OrderBookData {
  const bids = groupLevels(snapshot.bids, groupSize, false)
  const asks = groupLevels(snapshot.asks, groupSize, true)

  const build = (rows: { price: number; quantity: number }[]): OrderBookRow[] => {
    let cum = 0
    return rows.slice(0, limit).map((r) => {
      cum += r.quantity
      return { price: r.price, quantity: r.quantity, cumulative: cum, pct: 0 }
    })
  }

  const bidRows = build(bids)
  const askRows = build(asks)

  let maxTotal = 0
  for (const r of [...bidRows, ...askRows]) maxTotal = Math.max(maxTotal, r.cumulative)
  const withPct = (rows: OrderBookRow[]): OrderBookRow[] =>
    rows.map((r) => ({ ...r, pct: maxTotal > 0 ? r.cumulative / maxTotal : 0 }))

  const bestBid = bidRows[0]?.price ?? 0
  const bestAsk = askRows[0]?.price ?? 0

  return {
    asks: withPct(askRows),
    bids: withPct(bidRows),
    spread: Math.max(0, bestAsk - bestBid),
    maxTotal,
  }
}
