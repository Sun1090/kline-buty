import { describe, expect, it } from 'vitest'
import { tradesCsvFileName, tradesToCsv, fmtTradeTime } from '../tradesCsv'
import type { TradeRecord } from '../../hooks/usePaperAccount'

const open: TradeRecord = { id: '1', at: Date.UTC(2026, 0, 5, 8, 30, 15), symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100.5, qty: 2, fee: 0.2 }
const close: TradeRecord = { id: '2', at: Date.UTC(2026, 0, 5, 9, 0, 45), symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 110, qty: 2, fee: 0.22, pnl: 18.58 }

describe('fmtTradeTime', () => {
  it('格式化为 YYYY-MM-DD HH:MM:SS（本地时区）', () => {
    const s = fmtTradeTime(Date.UTC(2026, 0, 5, 8, 30, 15))
    expect(s).toMatch(/^2026-01-05 \d{2}:30:15$/)
  })
})

describe('tradesToCsv', () => {
  it('含表头行与每条流水（逗号分隔、CRLF 行尾）', () => {
    const csv = tradesToCsv([open, close])
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toBe('time,symbol,side,kind,price,qty,fee,pnl')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('BTCUSDT,buy,open')
    // 空 pnl（开仓）输出空字段
    expect(lines[1].split(',')[7]).toBe('')
    expect(lines[2]).toContain('BTCUSDT,sell,close')
    expect(lines[2].split(',')[7]).toBe('18.58')
  })

  it('空流水仍输出表头', () => {
    expect(tradesToCsv([]).trim()).toBe('time,symbol,side,kind,price,qty,fee,pnl')
  })

  it('数字用 fmtCsv 去尾零（100.5 → 100.5 而非 100.50000000）', () => {
    const csv = tradesToCsv([open])
    const row = csv.trim().split('\r\n')[1].split(',')
    expect(row[4]).toBe('100.5')
    expect(row[6]).toBe('0.2')
  })
})

describe('tradesCsvFileName', () => {
  it('格式 trades-YYYY-MM-DD.csv', () => {
    expect(tradesCsvFileName(new Date(Date.UTC(2026, 0, 5)))).toBe('trades-2026-01-05.csv')
  })
})
