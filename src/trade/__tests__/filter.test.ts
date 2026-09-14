import { describe, expect, it } from 'vitest'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import { filterTrades, tradeSymbols } from '../filter'

const t = (id: string, symbol: string, side: 'buy' | 'sell', kind: 'open' | 'close' = 'open', price = 100): TradeRecord =>
  ({ id, at: 0, symbol, side, kind, price, qty: 1, fee: 0.1 })

describe('filterTrades', () => {
  const trades = [
    t('1', 'BTCUSDT', 'buy'),
    t('2', 'BTCUSDT', 'sell', 'close', 60_000),
    t('3', 'ETHUSDT', 'buy'),
    t('4', 'SOLUSDT', 'sell'),
  ]
  it('无过滤条件原样返回（同一引用）', () => {
    expect(filterTrades(trades, {})).toBe(trades)
  })
  it('按品种过滤', () => {
    const out = filterTrades(trades, { symbol: 'BTCUSDT' })
    expect(out.map((r) => r.id)).toEqual(['1', '2'])
  })
  it('按方向过滤', () => {
    const out = filterTrades(trades, { side: 'sell' })
    expect(out.map((r) => r.id)).toEqual(['2', '4'])
  })
  it('品种 + 方向组合过滤', () => {
    const out = filterTrades(trades, { symbol: 'BTCUSDT', side: 'buy' })
    expect(out.map((r) => r.id)).toEqual(['1'])
  })
  it('关键词匹配品种子串（大小写不敏感）', () => {
    expect(filterTrades(trades, { query: 'eth' }).map((r) => r.id)).toEqual(['3'])
    expect(filterTrades(trades, { query: 'ETH' }).map((r) => r.id)).toEqual(['3'])
  })
  it('关键词匹配价格文本', () => {
    expect(filterTrades(trades, { query: '60000' }).map((r) => r.id)).toEqual(['2'])
  })
  it('关键词无匹配 → 空数组', () => {
    expect(filterTrades(trades, { query: 'DOGE' })).toEqual([])
  })
})

describe('tradeSymbols', () => {
  it('去重并保持出现顺序', () => {
    expect(
      tradeSymbols([t('1', 'BTCUSDT', 'buy'), t('2', 'ETHUSDT', 'buy'), t('3', 'BTCUSDT', 'sell')]),
    ).toEqual(['BTCUSDT', 'ETHUSDT'])
  })
  it('空流水 → 空数组', () => {
    expect(tradeSymbols([])).toEqual([])
  })
})
