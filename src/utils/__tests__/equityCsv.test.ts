import { describe, expect, it } from 'vitest'
import { equityToCsv, equityCsvFileName } from '../equityCsv'
import type { TradeRecord } from '../../hooks/usePaperAccount'

function rec(kind: 'open' | 'close', at: number, fee: number, pnl?: number): TradeRecord {
  return { id: String(at), at, symbol: 'BTCUSDT', side: 'buy', kind, price: 100, qty: 1, fee, ...(pnl !== undefined ? { pnl } : {}) }
}

describe('equityToCsv（J6 权益曲线导出）', () => {
  it('无成交 → 仅表头（无数据点）', () => {
    const csv = equityToCsv([], 10_000)
    expect(csv).toBe('time,equity')
  })

  it('开仓扣手续费、平仓加净盈亏 → 权益序列正确', () => {
    // 开仓 fee=1 → 9999；平仓 pnl=5 → 10004
    const trades = [
      rec('close', 3000, 0.5, 5),
      rec('open', 1000, 1),
    ]
    const csv = equityToCsv(trades, 10_000)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('time,equity')
    expect(lines).toHaveLength(3) // 表头 + 2 点
    expect(lines[1].endsWith(',9999.000000')).toBe(true) // 开仓后 9999
    expect(lines[2].endsWith(',10004.000000')).toBe(true) // 平仓后 +5−0.5=10004
  })

  it('按时间升序（输入新记录在前也能正确排序）', () => {
    const trades = [
      rec('close', 3000, 0, 5),
      rec('open', 1000, 0),
    ]
    const lines = equityToCsv(trades).split('\n')
    const t1 = new Date(lines[1].split(',')[0]).getTime()
    const t2 = new Date(lines[2].split(',')[0]).getTime()
    expect(t1).toBeLessThan(t2)
  })

  it('equityCsvFileName 含日期前缀', () => {
    expect(equityCsvFileName()).toMatch(/^kline-buty-equity-\d{8}\.csv$/)
  })
})
