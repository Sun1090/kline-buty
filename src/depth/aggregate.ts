export interface DepthRow {
  price: number
  quantity: number
}

export interface DepthPoint {
  price: number
  total: number
  side: 'bid' | 'ask'
}

/** 深度聚合：从盘口两端向中间累计，形成价格-累计量曲线 */
export function aggregateDepth(bids: DepthRow[], asks: DepthRow[]): DepthPoint[] {
  const sortedBids = [...bids].sort((a, b) => b.price - a.price) // 从最高买价起
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price) // 从最低卖价起

  const out: DepthPoint[] = []
  let bidTotal = 0
  for (const r of sortedBids) {
    bidTotal += r.quantity
    out.push({ price: r.price, total: bidTotal, side: 'bid' })
  }
  let askTotal = 0
  for (const r of sortedAsks) {
    askTotal += r.quantity
    out.push({ price: r.price, total: askTotal, side: 'ask' })
  }
  return out
}

export function maxTotal(points: DepthPoint[]): number {
  return points.reduce((m, p) => Math.max(m, p.total), 0)
}

/** 盘口最优价 */
export function bestPrice(bids: DepthRow[], asks: DepthRow[]): { bestBid: number; bestAsk: number } {
  const bestBid = bids.reduce((m, r) => Math.max(m, r.price), 0)
  const bestAsk = asks.reduce((m, r) => (m === 0 ? r.price : Math.min(m, r.price)), 0)
  return { bestBid, bestAsk }
}
