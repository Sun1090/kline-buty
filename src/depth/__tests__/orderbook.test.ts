import { describe, expect, it } from 'vitest'
import { orderBookRows } from '../orderbook'
import type { DepthSnapshot } from '../../hooks/useDepth'

const snap: DepthSnapshot = {
  bids: [
    { price: 100, quantity: 1 },
    { price: 99, quantity: 2 },
    { price: 98, quantity: 3 },
    { price: 97, quantity: 4 },
    { price: 96, quantity: 9 },
  ],
  asks: [
    { price: 101, quantity: 1 },
    { price: 102, quantity: 4 },
    { price: 103, quantity: 5 },
    { price: 104, quantity: 10 },
    { price: 105, quantity: 20 },
  ],
}

describe('orderBookRows 盘口聚合', () => {
  it('买盘从买一（最高价）向下，卖盘从卖一（最低价）向上', () => {
    const { bids, asks } = orderBookRows(snap)
    expect(bids.map((r) => r.price)).toEqual([100, 99, 98, 97, 96])
    expect(asks.map((r) => r.price)).toEqual([101, 102, 103, 104, 105])
  })

  it('累计量逐档累加', () => {
    const { bids, asks } = orderBookRows(snap)
    expect(bids.map((r) => r.cumulative)).toEqual([1, 3, 6, 10, 19])
    expect(asks.map((r) => r.cumulative)).toEqual([1, 5, 10, 20, 40])
  })

  it('limit 截断：各侧只保留前 N 档', () => {
    const { bids, asks } = orderBookRows(snap, 2)
    expect(bids).toHaveLength(2)
    expect(asks).toHaveLength(2)
    expect(bids[1].price).toBe(99)
    expect(asks[1].price).toBe(102)
  })

  it('pct 以两侧累计最大值为基准（最深一档 = 1）', () => {
    const { bids, asks } = orderBookRows(snap)
    expect(asks[asks.length - 1].pct).toBe(1)
    expect(bids[bids.length - 1].pct).toBeCloseTo(19 / 40, 5)
  })

  it('价差 = 卖一 - 买一', () => {
    expect(orderBookRows(snap).spread).toBe(1)
  })

  it('空盘口：空数组 + 价差/最大值为 0', () => {
    const empty: DepthSnapshot = { bids: [], asks: [] }
    const data = orderBookRows(empty)
    expect(data.bids).toEqual([])
    expect(data.asks).toEqual([])
    expect(data.spread).toBe(0)
    expect(data.maxTotal).toBe(0)
  })

  it('仅单侧有数据时不报错，另一侧为空', () => {
    const oneSide: DepthSnapshot = { bids: snap.bids.slice(0, 2), asks: [] }
    const data = orderBookRows(oneSide)
    expect(data.bids).toHaveLength(2)
    expect(data.asks).toEqual([])
    expect(data.spread).toBe(0)
  })
})
