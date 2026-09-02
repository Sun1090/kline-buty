import { describe, expect, it } from 'vitest'
import { estimateOrder, buildPositionFromOrder, mergePosition, DEFAULT_SLIPPAGE_RATIO, TAKER_FEE_RATE } from '../order'
import type { Position } from '../../position/pnl'

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

describe('estimateOrder 边界', () => {
  it('qty=0 → 名义金额/手续费/合计均为 0', () => {
    const e = estimateOrder(100, 0)
    expect(e.notional).toBe(0)
    expect(e.fee).toBe(0)
    expect(e.total).toBe(0)
  })

  it('price=0 → 全为 0（不产生 NaN）', () => {
    const e = estimateOrder(0, 5)
    expect(Number.isFinite(e.notional)).toBe(true)
    expect(e.notional).toBe(0)
    expect(e.total).toBe(0)
  })
})

describe('estimateOrder 滑点模型（D7）', () => {
  it('默认不滑点：fillPrice === price', () => {
    expect(estimateOrder(100, 2).fillPrice).toBe(100)
    expect(estimateOrder(100, 2).total).toBeCloseTo(200.2)
  })
  it('买盘正向滑点：fillPrice 高于盘口', () => {
    const e = estimateOrder(100, 2, 'buy', DEFAULT_SLIPPAGE_RATIO)
    expect(e.fillPrice).toBeCloseTo(100.02)
    expect(e.notional).toBeCloseTo(200.04)
  })
  it('卖盘负向滑点：fillPrice 低于盘口', () => {
    const e = estimateOrder(100, 2, 'sell', DEFAULT_SLIPPAGE_RATIO)
    expect(e.fillPrice).toBeCloseTo(99.98)
  })
  it('滑点 0 时与旧契约一致（纯函数回归）', () => {
    expect(estimateOrder(100, 2.5, 'buy', 0).notional).toBe(250)
    expect(estimateOrder(100, 2.5, 'buy', 0).fee).toBeCloseTo(0.25)
  })
})

describe('buildPositionFromOrder 边界', () => {
  it('默认 tpPct=3 / slPct=2', () => {
    const p = buildPositionFromOrder('buy', 200, 1)
    expect(p.takeProfit).toBeCloseTo(206)
    expect(p.stopLoss).toBeCloseTo(196)
  })

  it('卖单默认参数 → 做空', () => {
    const p = buildPositionFromOrder('sell', 200, 1)
    expect(p.direction).toBe('short')
    expect(p.takeProfit).toBeCloseTo(194)
    expect(p.stopLoss).toBeCloseTo(204)
  })
})

describe('mergePosition（D6 加权均价加仓/减仓）', () => {
  const longPos: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 103, stopLoss: 98 }
  const shortPos: Position = { entry: 100, quantity: 2, direction: 'short', takeProfit: 97, stopLoss: 102 }

  it('同方向加仓：新入口 = 加权均价，数量相加', () => {
    const merged = mergePosition(longPos, 'buy', 200, 2)!
    expect(merged.quantity).toBe(4)
    expect(merged.entry).toBeCloseTo(150) // (100×2 + 200×2) / 4
    expect(merged.direction).toBe('long')
  })

  it('空头同方向加仓：加权均价（空头新价高于原价抬升成本）', () => {
    const merged = mergePosition(shortPos, 'sell', 200, 2)!
    expect(merged.quantity).toBe(4)
    expect(merged.entry).toBeCloseTo(150)
    expect(merged.direction).toBe('short')
  })

  it('反方向部分减仓：数量相减', () => {
    const merged = mergePosition(longPos, 'sell', 100, 1)!
    expect(merged.quantity).toBe(1)
    expect(merged.entry).toBe(100)
    expect(merged.direction).toBe('long')
  })

  it('反方向恰好平仓 → null', () => {
    expect(mergePosition(longPos, 'sell', 100, 2)).toBeNull()
  })

  it('反手超量：剩余形成反向新仓（新单价格为准）', () => {
    const reversed = mergePosition(longPos, 'sell', 110, 5)!
    expect(reversed.direction).toBe('short')
    expect(reversed.quantity).toBe(3) // 5 − 2
    expect(reversed.entry).toBe(110)
  })

  it('加仓后 TP/SL 按新加权均价重算', () => {
    const merged = mergePosition(longPos, 'buy', 200, 2)!
    expect(merged.takeProfit).toBeCloseTo(150 * 1.03)
    expect(merged.stopLoss).toBeCloseTo(150 * 0.98)
  })
})
