import { describe, expect, it } from 'vitest'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import { tradeMarkersFor } from '../markers'

const t = (id: string, at: number, symbol: string, side: 'buy' | 'sell', price: number, kind: 'open' | 'close' = 'open'): TradeRecord =>
  ({ id, at, symbol, side, kind, price, qty: 1, fee: 0.1 })

const D0 = 1_767_571_200_000 // 2026-01-05 00:00 UTC（毫秒）

describe('tradeMarkersFor（v0.5.x 成交图面标记）', () => {
  it('仅取当前品种，时间戳毫秒→秒，按时间升序', () => {
    const trades = [
      t('a', D0 + 2_000, 'BTCUSDT', 'buy', 100, 'open'),
      t('b', D0 + 1_000, 'BTCUSDT', 'sell', 110, 'close'),
      t('c', D0 + 500, 'ETHUSDT', 'buy', 3000, 'open'), // 其他品种，排除
    ]
    const markers = tradeMarkersFor(trades, 'BTCUSDT')
    expect(markers).toEqual([
      { time: Math.floor((D0 + 1_000) / 1000), price: 110, side: 'sell' },
      { time: Math.floor((D0 + 2_000) / 1000), price: 100, side: 'buy' },
    ])
  })

  it('取最近 max 条防遮挡（新在前输入、升序输出后截尾）', () => {
    const trades = Array.from({ length: 5 }, (_, i) =>
      t(`id${i}`, D0 + i * 1_000, 'BTCUSDT', i % 2 === 0 ? 'buy' : 'sell', 100 + i),
    )
    const markers = tradeMarkersFor(trades, 'BTCUSDT', 2)
    expect(markers).toHaveLength(2)
    // 最后两条（时间最大）
    expect(markers[0].time).toBe(Math.floor((D0 + 3_000) / 1000))
    expect(markers[1].time).toBe(Math.floor((D0 + 4_000) / 1000))
  })

  it('无该品种成交 → 空数组', () => {
    expect(tradeMarkersFor([t('a', D0, 'ETHUSDT', 'buy', 3000)], 'BTCUSDT')).toEqual([])
    expect(tradeMarkersFor([], 'BTCUSDT')).toEqual([])
  })
})
