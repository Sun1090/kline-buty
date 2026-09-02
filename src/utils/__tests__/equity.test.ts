import { describe, expect, it } from 'vitest'
import { equitySeries } from '../equity'
import type { TradeRecord } from '../../hooks/usePaperAccount'

function open(at: number, fee: number): TradeRecord {
  return { id: `o${at}`, at, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 1, fee }
}

function close(at: number, fee: number, pnl: number): TradeRecord {
  return { id: `c${at}`, at, symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 110, qty: 1, fee, pnl }
}

describe('equitySeries（D13 权益曲线）', () => {
  it('空流水 → 空序列（无权益点）', () => {
    expect(equitySeries([])).toEqual([])
  })

  it('开仓扣费 → 权益 = 初始 − 手续费', () => {
    const out = equitySeries([open(1, 10)])
    expect(out).toHaveLength(1)
    expect(out[0].equity).toBe(9990)
  })

  it('开仓后平仓盈利 → 权益 = 初始 − 开仓费 + 净盈亏', () => {
    // 记录新在前：[close, open]
    const trades = [close(200, 5, 50), open(100, 10)]
    const out = equitySeries(trades)
    expect(out.map((p) => p.equity)).toEqual([9990, 9990 + 50])
  })

  it('开仓后平仓亏损 → 权益下降（pnl 为负）', () => {
    const trades = [close(200, 5, -30), open(100, 10)]
    const out = equitySeries(trades)
    expect(out[0].equity).toBe(9990)
    expect(out[1].equity).toBe(9960)
  })

  it('按时间升序输出（新记录在前被反转为升序）', () => {
    const trades = [close(300, 1, 1), close(200, 1, 1), open(100, 1)]
    const out = equitySeries(trades)
    const times = out.map((p) => p.at)
    expect(times).toEqual([100, 200, 300])
  })

  it('自定义初始资金生效', () => {
    const out = equitySeries([open(1, 10)], 2000)
    expect(out[0].equity).toBe(1990)
  })
})
