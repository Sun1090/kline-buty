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

/** 盘口订单簿：两侧各取前 limit 档，按价格从最优价向外排列，附带累计量与占比 */
export function orderBookRows(snapshot: DepthSnapshot, limit = 8): OrderBookData {
  const bids = [...snapshot.bids].sort((a, b) => b.price - a.price)
  const asks = [...snapshot.asks].sort((a, b) => a.price - b.price)

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
