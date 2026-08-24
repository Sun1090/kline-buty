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

  it('groupSize 聚合：同价格桶合并数量，桶价向下取整', () => {
    // ×10 聚合：bids 100 → 桶 100；99/98/97/96 → 桶 90；asks 101~105 → 桶 100
    const { bids, asks } = orderBookRows(snap, 8, 10)
    expect(bids.map((r) => r.price)).toEqual([100, 90])
    expect(bids[0].quantity).toBe(1) // 100 桶：仅 100
    expect(bids[1].quantity).toBe(2 + 3 + 4 + 9) // 90 桶：99/98/97/96
    expect(asks.map((r) => r.price)).toEqual([100])
    expect(asks[0].quantity).toBe(1 + 4 + 5 + 10 + 20) // 100 桶：101~105
    expect(asks[0].cumulative).toBe(40)
  })

  it('groupSize 聚合后 spread 按桶边界计算', () => {
    // ×10：卖一桶 100，买一桶 100 → 价差 0；桶 90 存在但买一仍是 100
    const { spread } = orderBookRows(snap, 8, 10)
    expect(spread).toBe(0)
  })

  it('groupSize = 0 等价于不聚合；groupSize = 1 会取整到整数价', () => {
    const raw = orderBookRows(snap)
    const g0 = orderBookRows(snap, 8, 0)
    expect(g0.bids.map((r) => r.price)).toEqual(raw.bids.map((r) => r.price))
    expect(g0.asks.map((r) => r.price)).toEqual(raw.asks.map((r) => r.price))
    const frac: DepthSnapshot = {
      bids: [{ price: 99.5, quantity: 1 }],
      asks: [{ price: 100.5, quantity: 2 }],
    }
    expect(orderBookRows(frac, 8, 0).bids[0].price).toBe(99.5)
    expect(orderBookRows(frac, 8, 1).bids[0].price).toBe(99)
  })
})
