import { describe, expect, it } from 'vitest'
import { filterSymbols } from '../useSymbolList'

const all = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'BTCDOMUSDT', 'PEPEUSDT', 'AAVEUSDT']

describe('filterSymbols', () => {
  it('空查询返回前 limit 个', () => {
    expect(filterSymbols(all, '', 3)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  })
  it('前缀匹配优先', () => {
    expect(filterSymbols(all, 'btc', 10)).toEqual(['BTCUSDT', 'BTCDOMUSDT'])
  })
  it('包含匹配排在前缀后', () => {
    expect(filterSymbols(all, 'usdt', 10)).toEqual(all)
    expect(filterSymbols(['AAVEUSDT', 'PEPEUSDT'], 'pe', 10)).toEqual(['PEPEUSDT'])
  })
  it('大小写不敏感 + 结果数量限制', () => {
    expect(filterSymbols(all, 'USDT', 3)).toHaveLength(3)
    expect(filterSymbols(all, 'xyz', 10)).toHaveLength(0)
  })
})
