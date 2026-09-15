import { describe, expect, it } from 'vitest'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import { symbolBreakdown } from '../breakdown'

const t = (id: string, symbol: string, kind: 'open' | 'close', pnl?: number): TradeRecord =>
  ({ id, at: 0, symbol, side: 'buy', kind, price: 100, qty: 1, fee: 0.1, feeRate: 0.001, ...(pnl !== undefined ? { pnl } : {}) })

describe('symbolBreakdown', () => {
  it('空流水 → 空数组', () => {
    expect(symbolBreakdown([])).toEqual([])
  })
  it('按品种聚合：笔数/已平仓/净盈亏/胜率', () => {
    const trades = [
      t('1', 'BTCUSDT', 'open'),
      t('2', 'BTCUSDT', 'close', 10),
      t('3', 'BTCUSDT', 'close', -5),
      t('4', 'ETHUSDT', 'close', 3),
    ]
    const out = symbolBreakdown(trades)
    // BTCUSDT pnl 5 > ETHUSDT 3 → 降序
    expect(out.map((b) => b.symbol)).toEqual(['BTCUSDT', 'ETHUSDT'])
    expect(out[0]).toMatchObject({ symbol: 'BTCUSDT', count: 3, closed: 2, pnl: 5, wins: 1, losses: 1, winRate: 0.5 })
    expect(out[1]).toMatchObject({ symbol: 'ETHUSDT', count: 1, closed: 1, pnl: 3, wins: 1, losses: 0, winRate: 1 })
  })
  it('无平仓品种胜率 0 / pnl 0', () => {
    const out = symbolBreakdown([t('1', 'SOLUSDT', 'open')])
    expect(out[0]).toMatchObject({ symbol: 'SOLUSDT', count: 1, closed: 0, pnl: 0, winRate: 0 })
  })
})
