import { describe, expect, it } from 'vitest'
import { tradeStats } from '../stats'
import type { TradeRecord } from '../../hooks/usePaperAccount'

const close = (pnl: number): TradeRecord => ({
  id: `c${pnl}`,
  at: 0,
  symbol: 'BTCUSDT',
  side: 'buy',
  kind: 'close',
  price: 65000,
  qty: 0.1,
  fee: 0.5,
  pnl,
})

describe('tradeStats（D6 交易盈亏统计）', () => {
  it('空流水 → 全零统计', () => {
    expect(tradeStats([])).toEqual({
      closed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    })
  })

  it('混合盈亏 → 胜率/累计/盈亏比正确', () => {
    const s = tradeStats([close(100), close(-40), close(60), close(0)])
    expect(s.closed).toBe(4)
    expect(s.wins).toBe(2) // 100、60
    expect(s.losses).toBe(1) // -40；0 不计
    expect(s.winRate).toBeCloseTo(0.5)
    expect(s.totalPnl).toBe(120) // 100 - 40 + 60 + 0
    expect(s.avgWin).toBeCloseTo(80)
    expect(s.avgLoss).toBeCloseTo(40)
    expect(s.profitFactor).toBeCloseTo(160 / 40) // 4
  })

  it('全胜（无亏损）→ 盈亏比为正胜额；全亏 → 0', () => {
    const allWin = tradeStats([close(10), close(20)])
    expect(allWin.losses).toBe(0)
    expect(allWin.profitFactor).toBeCloseTo(30)
    expect(tradeStats([close(-5)]).profitFactor).toBe(0)
  })

  it('只统计平仓记录，开仓记录忽略', () => {
    const open: TradeRecord = { id: 'o', at: 0, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 1, qty: 1, fee: 0.1 }
    expect(tradeStats([open, close(50)]).closed).toBe(1)
  })
})