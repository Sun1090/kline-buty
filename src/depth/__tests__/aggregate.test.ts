import { describe, expect, it } from 'vitest'
import { aggregateDepth, maxTotal, bestPrice, type DepthRow } from '../aggregate'

const bids: DepthRow[] = [
  { price: 100, quantity: 1 },
  { price: 99, quantity: 2 },
  { price: 98, quantity: 3 },
]
const asks: DepthRow[] = [
  { price: 101, quantity: 1 },
  { price: 102, quantity: 4 },
  { price: 103, quantity: 5 },
]

describe('aggregateDepth', () => {
  it('买盘从最高价向下累计', () => {
    const bidPoints = aggregateDepth(bids, []).filter((p) => p.side === 'bid')
    expect(bidPoints).toHaveLength(3)
    expect(bidPoints[0]).toEqual({ price: 100, total: 1, side: 'bid' })
    expect(bidPoints[1].total).toBe(3)
    expect(bidPoints[2].total).toBe(6)
  })

  it('卖盘从最低价向上累计', () => {
    const askPoints = aggregateDepth([], asks).filter((p) => p.side === 'ask')
    expect(askPoints[0].total).toBe(1)
    expect(askPoints[2].total).toBe(10)
  })

  it('盘口无序输入仍按正确顺序累计', () => {
    const pts = aggregateDepth(
      [
        { price: 99, quantity: 2 },
        { price: 100, quantity: 1 },
      ],
      [
        { price: 103, quantity: 5 },
        { price: 101, quantity: 1 },
      ],
    )
    const bids = pts.filter((p) => p.side === 'bid')
    expect(bids[0].price).toBe(100)
    const asks = pts.filter((p) => p.side === 'ask')
    expect(asks[0].price).toBe(101)
  })
})

describe('maxTotal / bestPrice', () => {
  it('maxTotal 取累计最大值', () => {
    expect(maxTotal(aggregateDepth(bids, asks))).toBe(10)
  })
  it('bestPrice 返回最优买卖价', () => {
    const { bestBid, bestAsk } = bestPrice(bids, asks)
    expect(bestBid).toBe(100)
    expect(bestAsk).toBe(101)
  })
})
