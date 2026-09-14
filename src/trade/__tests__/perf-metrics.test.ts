import { describe, expect, it } from 'vitest'
import type { EquityPoint } from '../../utils/equity'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import {
  maxDrawdown,
  currentDrawdown,
  maxDrawdownAmount,
  scaleEquity,
  pnlBars,
} from '../perf'

const eq = (v: number, at = 0): EquityPoint => ({ at, equity: v })

describe('maxDrawdown', () => {
  it('空/单点 → 0', () => {
    expect(maxDrawdown([])).toBe(0)
    expect(maxDrawdown([eq(10_000)])).toBe(0)
  })
  it('一路上涨无回撤 → 0', () => {
    expect(maxDrawdown([eq(10_000), eq(10_100), eq(10_300)])).toBe(0)
  })
  it('下跌回撤后回升，取最大峰谷比例', () => {
    const pts = [eq(10_000), eq(10_500), eq(9_450), eq(10_000)]
    // 峰 10500 → 谷 9450：1050/10500 = 0.1
    expect(maxDrawdown(pts)).toBeCloseTo(0.1, 10)
  })
  it('中途更高峰产生更大回撤', () => {
    const pts = [eq(10_000), eq(11_000), eq(8_800), eq(10_000)]
    // 峰 11000 → 谷 8800：2200/11000 = 0.2
    expect(maxDrawdown(pts)).toBeCloseTo(0.2, 10)
  })
  it('回撤后再创新高，新峰为基准', () => {
    const pts = [eq(10_000), eq(9_500), eq(11_000), eq(9_900)]
    // 峰 11000 → 谷 9900：1100/11000 = 0.1
    expect(maxDrawdown(pts)).toBeCloseTo(0.1, 10)
  })
  it('initialBalance 作为初始峰值参考（开仓费下探计入回撤）', () => {
    const pts = [eq(9_999.8), eq(10_018.38)]
    // 峰以初始 10000 为基准 → 谷 9999.8：0.2/10000（此后回升，无更大峰谷）
    expect(maxDrawdown(pts, 10_000)).toBeCloseTo((10_000 - 9_999.8) / 10_000, 10)
    // 不传 initialBalance → 峰值从首点起算，无回撤
    expect(maxDrawdown(pts)).toBe(0)
  })
  it('initialBalance 大于所有权益点时以它为峰', () => {
    const pts = [eq(9_999.5), eq(9_949.5)]
    // 峰 10000 → 谷 9949.5：50.5/10000 = 0.00505
    expect(maxDrawdown(pts, 10_000)).toBeCloseTo(0.00505, 10)
  })
})

describe('currentDrawdown', () => {
  it('空 → 0', () => {
    expect(currentDrawdown([])).toBe(0)
  })
  it('位于新高 → 0', () => {
    expect(currentDrawdown([eq(10_000), eq(10_200)])).toBe(0)
  })
  it('较峰值回落 → 比例', () => {
    const pts = [eq(10_000), eq(10_400), eq(9_880)]
    // 10400 → 9880：520/10400 = 0.05
    expect(currentDrawdown(pts)).toBeCloseTo(0.05, 10)
  })
  it('initialBalance 计入当前回撤参考峰', () => {
    const pts = [eq(9_999.5), eq(9_949.5)]
    // 峰 10000 → 末 9949.5：50.5/10000
    expect(currentDrawdown(pts, 10_000)).toBeCloseTo(0.00505, 10)
  })
})

describe('maxDrawdownAmount', () => {
  it('空 → 0', () => {
    expect(maxDrawdownAmount([])).toBe(0)
  })
  it('峰谷绝对差', () => {
    const pts = [eq(10_000), eq(11_000), eq(8_800)]
    expect(maxDrawdownAmount(pts)).toBeCloseTo(2_200, 10)
  })
})

describe('scaleEquity', () => {
  it('空 → 空路径', () => {
    const s = scaleEquity([], 340, 120)
    expect(s.path).toBe('')
    expect(s.area).toBe('')
    expect(s.xs).toEqual([])
  })
  it('单点 → 水平居中单个点', () => {
    const s = scaleEquity([eq(10_000)], 340, 120)
    expect(s.xs).toEqual([170])
    expect(s.path).toBe('M170.0 60.0')
    expect(s.area).toBe('')
  })
  it('全平 → 中线避免除零', () => {
    const s = scaleEquity([eq(10_000), eq(10_000), eq(10_000)], 340, 120)
    expect(s.min).toBe(10_000)
    expect(s.max).toBe(10_000)
    expect(s.ys[0]).toBe(s.ys[2]) // 平线
  })
  it('两点上坡 → 首点在上、末点在下', () => {
    const s = scaleEquity([eq(9_000), eq(11_000)], 340, 120)
    expect(s.xs[0]).toBe(0)
    expect(s.xs[1]).toBe(340)
    expect(s.ys[0]).toBeGreaterThan(s.ys[1]) // 权益高 → y 小（上）
  })
  it('area 闭合到图表底边', () => {
    const s = scaleEquity([eq(9_000), eq(11_000), eq(10_000)], 340, 120)
    expect(s.area).toContain('Z')
    expect(s.area).toContain('120.0')
  })
  it('最小值非零时按相对差缩放', () => {
    const s = scaleEquity([eq(10_000), eq(10_200)], 340, 120)
    // span=200，inner=100：末点 y = 120-10-100 = 10，首点 y = 110
    expect(s.ys[0]).toBeCloseTo(110, 5)
    expect(s.ys[1]).toBeCloseTo(10, 5)
  })
})

const closeTrade = (at: number, pnl: number, side: 'buy' | 'sell' = 'sell'): TradeRecord =>
  ({ id: `c${at}`, at, symbol: 'BTCUSDT', side, kind: 'close', price: 100, qty: 1, fee: 0.1, feeRate: 0.001, pnl })

const openTrade = (at: number): TradeRecord =>
  ({ id: `o${at}`, at, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 1, fee: 0.1, feeRate: 0.001 })

describe('pnlBars', () => {
  it('无平仓 → 空数组', () => {
    expect(pnlBars([])).toEqual([])
    expect(pnlBars([openTrade(100)])).toEqual([])
  })
  it('新记录在前 → 反转为时间升序', () => {
    const trades = [closeTrade(300, 5), closeTrade(200, -3), openTrade(100)]
    expect(pnlBars(trades).map((b) => b.at)).toEqual([200, 300])
  })
  it('保留方向与盈亏', () => {
    const trades = [closeTrade(200, -3, 'buy'), closeTrade(100, 5, 'sell')]
    const bars = pnlBars(trades)
    expect(bars[0]).toEqual({ at: 100, pnl: 5, side: 'sell' })
    expect(bars[1]).toEqual({ at: 200, pnl: -3, side: 'buy' })
  })
  it('仅统计已平仓记录（开仓被忽略）', () => {
    const trades = [closeTrade(300, 7), openTrade(200), closeTrade(100, -2)]
    expect(pnlBars(trades)).toHaveLength(2)
  })
})
