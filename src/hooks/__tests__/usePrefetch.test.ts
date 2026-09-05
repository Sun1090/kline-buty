import { describe, expect, it, vi, beforeEach } from 'vitest'
import { adjacentSymbols, prefetchSymbol } from '../usePrefetch'

const LIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']

// O7：mock 数据源与缓存，测 prefetchSymbol 三态（缓存命中/拉取写入/失败静默）
vi.mock('../../data/binance/rest', () => ({
  fetchKlines: vi.fn(async () => [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10, isClosed: true }]),
}))

vi.mock('../../data/cache', () => {
  const m = new Map<string, unknown[]>()
  return {
    readCachedCandles: vi.fn((s: string) => m.get(s) ?? null),
    writeCachedCandles: vi.fn((s: string, _p: unknown, hist: unknown[]) => {
      m.set(s, hist)
    }),
  }
})

import { fetchKlines } from '../../data/binance/rest'
import { writeCachedCandles, readCachedCandles } from '../../data/cache'

beforeEach(() => {
  vi.clearAllMocks()
})

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

describe('prefetchSymbol（O7 覆盖预取三态）', () => {
  it('已有缓存 → 跳过拉取', async () => {
    ;(readCachedCandles as ReturnType<typeof vi.fn>).mockReturnValue([{ time: 1 }])
    await prefetchSymbol('BTCUSDT', '1m')
    expect(fetchKlines).not.toHaveBeenCalled()
    expect(writeCachedCandles).not.toHaveBeenCalled()
  })

  it('无缓存 → 拉取并写缓存', async () => {
    ;(readCachedCandles as ReturnType<typeof vi.fn>).mockReturnValue(null)
    await prefetchSymbol('BTCUSDT', '1m')
    expect(fetchKlines).toHaveBeenCalledWith('BTCUSDT', '1m', 500)
    expect(writeCachedCandles).toHaveBeenCalledTimes(1)
  })

  it('拉取失败 → 静默不抛', async () => {
    ;(readCachedCandles as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(fetchKlines as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    await expect(prefetchSymbol('BTCUSDT', '1m')).resolves.toBeUndefined()
    expect(writeCachedCandles).not.toHaveBeenCalled()
  })
})
