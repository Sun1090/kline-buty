import { describe, expect, it } from 'vitest'
import { estimateOrder, buildPositionFromOrder, TAKER_FEE_RATE } from '../order'

describe('estimateOrder', () => {
  it('名义金额 = price × qty', () => {
    expect(estimateOrder(100, 2.5).notional).toBe(250)
  })

  it('手续费 = 名义金额 × 0.1%', () => {
    expect(estimateOrder(100, 1).fee).toBeCloseTo(0.1)
    expect(estimateOrder(63000, 0.01).fee).toBeCloseTo(0.63)
    expect(TAKER_FEE_RATE).toBe(0.001)
  })

  it('合计 = 名义金额 + 手续费', () => {
    const e = estimateOrder(200, 3)
    expect(e.total).toBeCloseTo(e.notional + e.fee)
  })

  it('重复调用结果稳定（纯函数）', () => {
    expect(estimateOrder(50, 2)).toEqual(estimateOrder(50, 2))
  })
})

describe('buildPositionFromOrder', () => {
  it('买 → 做多，止盈=entry×1.03 / 止损=entry×0.98', () => {
    const p = buildPositionFromOrder('buy', 100, 2)
    expect(p.direction).toBe('long')
    expect(p.entry).toBe(100)
    expect(p.quantity).toBe(2)
    expect(p.takeProfit).toBeCloseTo(103)
    expect(p.stopLoss).toBeCloseTo(98)
  })

  it('卖 → 做空，止盈=entry×0.97 / 止损=entry×1.02', () => {
    const p = buildPositionFromOrder('sell', 100, 1)
    expect(p.direction).toBe('short')
    expect(p.takeProfit).toBeCloseTo(97)
    expect(p.stopLoss).toBeCloseTo(102)
  })

  it('自定义止盈/止损百分比', () => {
    const p = buildPositionFromOrder('buy', 100, 1, 5, 4)
    expect(p.takeProfit).toBeCloseTo(105)
    expect(p.stopLoss).toBeCloseTo(96)
  })
})
