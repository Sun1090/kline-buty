import { describe, expect, it } from 'vitest'
import { calcPnl, suggestLevels, checkHit, type Position } from '../pnl'

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
