import { describe, expect, it } from 'vitest'
import { calcPnl, suggestLevels, checkHit, calcLiquidationPrice, calcMargin, type Position } from '../pnl'

const longPos: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 110, stopLoss: 95 }
const shortPos: Position = { entry: 100, quantity: 2, direction: 'short', takeProfit: 90, stopLoss: 105 }

describe('calcPnl', () => {
  it('多头上涨盈利', () => {
    const r = calcPnl(longPos, 110)
    expect(r.pnl).toBe(20)
    expect(r.pnlPct).toBe(10)
  })
  it('多头下跌亏损', () => {
    const r = calcPnl(longPos, 95)
    expect(r.pnl).toBe(-10)
    expect(r.pnlPct).toBe(-5)
  })
  it('空头下跌盈利', () => {
    const r = calcPnl(shortPos, 90)
    expect(r.pnl).toBe(20)
  })
  it('空头上涨亏损', () => {
    const r = calcPnl(shortPos, 105)
    expect(r.pnl).toBe(-10)
  })
})

describe('suggestLevels', () => {
  it('多头：TP 高于入场，SL 低于入场', () => {
    const l = suggestLevels(100, 'long', 5, 2)
    expect(l.takeProfit).toBe(105)
    expect(l.stopLoss).toBe(98)
  })
  it('空头：TP 低于入场，SL 高于入场', () => {
    const l = suggestLevels(100, 'short', 5, 2)
    expect(l.takeProfit).toBe(95)
    expect(l.stopLoss).toBe(102)
  })
})

describe('checkHit', () => {
  it('多头触达止盈', () => expect(checkHit(longPos, 110)).toBe('takeProfit'))
  it('多头触达止损', () => expect(checkHit(longPos, 95)).toBe('stopLoss'))
  it('空头触达止盈（价格下跌）', () => expect(checkHit(shortPos, 90)).toBe('takeProfit'))
  it('空头触达止损（价格上涨）', () => expect(checkHit(shortPos, 105)).toBe('stopLoss'))
  it('区间内未触发', () => expect(checkHit(longPos, 100)).toBeNull())
})

describe('calcPnl 边界', () => {
  it('entry=0 → pnlPct 返回 0（避免除零）', () => {
    const r = calcPnl({ entry: 0, quantity: 1, direction: 'long' }, 100)
    expect(r.pnl).toBe(100)
    expect(r.pnlPct).toBe(0)
    expect(Number.isFinite(r.pnlPct)).toBe(true)
  })

  it('quantity=0 → pnl 与 pnlPct 均为 0', () => {
    const r = calcPnl({ entry: 100, quantity: 0, direction: 'long' }, 110)
    expect(r.pnl).toBe(0)
  })
})

describe('checkHit 边界', () => {
  it('无止盈止损 → 恒为 null', () => {
    const noLevels: Position = { entry: 100, quantity: 1, direction: 'long' }
    expect(checkHit(noLevels, 200)).toBeNull()
    expect(checkHit(noLevels, 50)).toBeNull()
  })

  it('多头止盈止损同时触达 → 优先止盈', () => {
    // 极端构造：止盈=止损=100，价格=100
    const pos: Position = { entry: 100, quantity: 1, direction: 'long', takeProfit: 100, stopLoss: 100 }
    expect(checkHit(pos, 100)).toBe('takeProfit')
  })

  it('空头止盈止损同时触达 → 优先止盈', () => {
    const pos: Position = { entry: 100, quantity: 1, direction: 'short', takeProfit: 100, stopLoss: 100 }
    expect(checkHit(pos, 100)).toBe('takeProfit')
  })

  it('空头区间内未触发', () => {
    expect(checkHit(shortPos, 100)).toBeNull()
  })
})

describe('calcLiquidationPrice', () => {
  it('10x 多头：强平价 = entry×(1−1/10)', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'long' }
    expect(calcLiquidationPrice(p, 10)).toBe(90)
  })
  it('10x 空头：强平价 = entry×(1+1/10)', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'short' }
    expect(calcLiquidationPrice(p, 10)).toBeCloseTo(110)
  })
  it('5x 多头：强平价低于 1x（亏损 20% 触发）', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'long' }
    expect(calcLiquidationPrice(p, 5)).toBe(80)
  })
  it('杠杆 ≤1 返回 null（无效杠杆）', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'long' }
    expect(calcLiquidationPrice(p, 1)).toBeNull()
    expect(calcLiquidationPrice(p, 0.5)).toBeNull()
    expect(calcLiquidationPrice(p, NaN)).toBeNull()
  })
  it('杠杆越高强平价越贴近入场价', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'long' }
    expect(calcLiquidationPrice(p, 100) as number).toBeGreaterThan(90)
  })
})

describe('calcMargin', () => {
  it('10x 杠杆：保证金 = 名义/10', () => {
    expect(calcMargin(10_000, 10)).toBe(1000)
  })
  it('1x 杠杆：保证金 = 全额名义', () => {
    expect(calcMargin(5000, 1)).toBe(5000)
  })
  it('0/负数/NaN 杠杆回退全额', () => {
    expect(calcMargin(1000, 0)).toBe(1000)
    expect(calcMargin(1000, -3)).toBe(1000)
    expect(calcMargin(1000, NaN)).toBe(1000)
  })
})
