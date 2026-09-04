import { describe, expect, it } from 'vitest'
import { adjacentSymbols } from '../usePrefetch'

const LIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']

describe('adjacentSymbols（N7 数据预取相邻品种）', () => {
  it('返回当前位置前后各 2 个', () => {
    const out = adjacentSymbols('SOLUSDT', LIST)
    expect(out).toContain('ETHUSDT')
    expect(out).toContain('BTCUSDT')
    expect(out).toContain('BNBUSDT')
    expect(out).toContain('XRPUSDT')
    expect(out).not.toContain('SOLUSDT')
  })

  it('列表头：前环绕到尾', () => {
    const out = adjacentSymbols('BTCUSDT', LIST)
    // 前两个：DOGEUSDT（尾环绕）、XRPUSDT；后两个：ETHUSDT、SOLUSDT
    expect(out).toContain('DOGEUSDT')
    expect(out).toContain('XRPUSDT')
    expect(out).toContain('ETHUSDT')
    expect(out).toContain('SOLUSDT')
    expect(out).not.toContain('BTCUSDT')
  })

  it('未知品种 → 空列表', () => {
    expect(adjacentSymbols('UNKNOWN', LIST)).toEqual([])
  })

  it('去重：短列表环绕不产生重复', () => {
    const short = ['A', 'B']
    const out = adjacentSymbols('A', short)
    expect(new Set(out).size).toBe(out.length)
    expect(out).toContain('B')
  })
})
