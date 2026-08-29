import { describe, expect, it } from 'vitest'
import { calcSupertrend } from '../supertrend'
import { calcATR } from '../extras'
import type { Candle } from '../../chart/types'

function mkCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    time: i + 1,
    open: close,
    high: close * 1.01,
    low: close * 0.99,
    close,
    volume: 1,
    isClosed: true,
  }))
}

describe('calcSupertrend', () => {
  it('数据不足 ATR 周期时返回空', () => {
    const r = calcSupertrend(mkCandles([10, 10.5, 10.2]), 14, 3)
    expect(r.raw).toEqual([])
    expect(r.up).toEqual([])
    expect(r.down).toEqual([])
  })

  it('段点数与 raw 一致（翻转点同时在两段）', () => {
    const closes: number[] = []
    for (let i = 0; i < 40; i++) closes.push(i < 20 ? 100 + i * 0.5 : 140 - (i - 20) * 1.2)
    const r = calcSupertrend(mkCandles(closes), 10, 3)
    const flips = r.raw.filter((p, i) => i > 0 && p.bull !== r.raw[i - 1].bull).length
    expect(r.up.length + r.down.length).toBe(r.raw.length + flips)
    // 每个点恰在 up 或 down 中（翻转点在两者）
    const times = new Set([...r.up, ...r.down].map((p) => p.time))
    expect(times.size).toBe(r.raw.length)
  })

  it('单边上涨段全程 bull 且值 = 下轨（随价格棘轮上移）', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i)
    const r = calcSupertrend(mkCandles(closes), 10, 3)
    expect(r.raw.every((p) => p.bull)).toBe(true)
    expect(r.down).toHaveLength(0)
    const atr = calcATR(mkCandles(closes), 10)
    const lastAtr = atr[atr.length - 1].value
    const last = r.raw[r.raw.length - 1]
    const mid = (closes[39] * 1.01 + closes[39] * 0.99) / 2
    expect(last.value).toBeCloseTo(mid - 3 * lastAtr, 8)
  })

  it('深幅下跌触发翻转：bull → bear，值切换为上轨', () => {
    const closes: number[] = []
    for (let i = 0; i < 30; i++) closes.push(100 + i * 0.3)
    for (let i = 0; i < 10; i++) closes.push(108.7 - (i + 1) * 4) // 急跌
    const r = calcSupertrend(mkCandles(closes), 10, 3)
    expect(r.raw.some((p) => p.bull)).toBe(true)
    expect(r.raw.some((p) => !p.bull)).toBe(true)
    const i = r.raw.findIndex((p) => !p.bull)
    // 翻转后 bull 段不再新增（除翻转衔接点）
    expect(r.up[r.up.length - 1].time).toBe(r.raw[i].time)
  })
})
