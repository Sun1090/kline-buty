import { describe, expect, it } from 'vitest'
import { fmtCompact, sideTotals, spreadOf } from '../format'
import { aggregateDepth, type DepthRow } from '../aggregate'

describe('fmtCompact 紧凑格式化', () => {
  it('百万级 → M 后缀，保留 2 位小数去尾零', () => {
    expect(fmtCompact(1_234_567)).toBe('1.23M')
    expect(fmtCompact(4_500_000)).toBe('4.5M')
  })
  it('千级 → K 后缀', () => {
    expect(fmtCompact(1234)).toBe('1.23K')
    expect(fmtCompact(999)).toBe('999')
    expect(fmtCompact(10_000)).toBe('10K')
  })
  it('百级取整 / 十级 1 位 / 个位 2 位小数', () => {
    expect(fmtCompact(123.4)).toBe('123')
    expect(fmtCompact(12.34)).toBe('12.3')
    expect(fmtCompact(1.234)).toBe('1.23')
    expect(fmtCompact(0.5)).toBe('0.5')
  })
  it('非有限数回退 0', () => {
    expect(fmtCompact(NaN)).toBe('0')
    expect(fmtCompact(Infinity)).toBe('0')
  })
})

describe('sideTotals 两侧累计总量', () => {
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
  it('买/卖两侧取各自累计最大值', () => {
    const pts = aggregateDepth(bids, asks)
    expect(sideTotals(pts)).toEqual({ bidTotal: 6, askTotal: 10 })
  })
  it('单侧为空时另一侧为 0', () => {
    expect(sideTotals(aggregateDepth(bids, []))).toEqual({ bidTotal: 6, askTotal: 0 })
  })
})

describe('spreadOf 价差', () => {
  it('买一卖一差值为正', () => {
    expect(spreadOf(100, 101)).toBe(1)
  })
  it('异常（卖≤买）时回退 0', () => {
    expect(spreadOf(101, 100)).toBe(0)
    expect(spreadOf(100, 100)).toBe(0)
  })
})
