import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { calcSMA, calcEMA } from '../sma'
import { calcBOLL } from '../boll'
import { calcMACD } from '../macd'
import { calcKDJ } from '../kdj'
import { calcRSI } from '../rsi'

/** 构造测试 K 线：time 从 0 递增，open=close=v（单调序列） */
function series(values: number[]): Candle[] {
  return values.map((v, i) => ({
    time: i,
    open: v,
    high: v,
    low: v,
    close: v,
    volume: 1,
    isClosed: true,
  }))
}

const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const candles = series(values)

describe('calcSMA', () => {
  it('窗口自 period-1 起有效，均值正确', () => {
    const out = calcSMA(
      candles.map((c) => ({ time: c.time, value: c.close })),
      3,
    )
    expect(out).toHaveLength(values.length - 2)
    expect(out[0]).toEqual({ time: 2, value: 2 })
    expect(out[1]).toEqual({ time: 3, value: 3 })
    expect(out[out.length - 1]).toEqual({ time: 9, value: 9 })
  })
})

describe('calcEMA', () => {
  it('单调递增序列 EMA 收敛于最新值附近', () => {
    const out = calcEMA(
      candles.map((c) => ({ time: c.time, value: c.close })),
      3,
    )
    expect(out).toHaveLength(values.length - 2)
    const last = out[out.length - 1].value
    expect(last).toBeGreaterThanOrEqual(9)
    expect(last).toBeLessThan(10)
  })
  it('常数列 EMA 等于常数', () => {
    const flat = calcEMA(
      series([5, 5, 5, 5, 5]).map((c) => ({ time: c.time, value: c.close })),
      3,
    )
    for (const p of flat) expect(p.value).toBe(5)
  })
})

describe('calcBOLL', () => {
  const boll = calcBOLL(candles, 5)
  it('上轨 ≥ 中轨 ≥ 下轨', () => {
    for (const p of boll) {
      expect(p.upper).toBeGreaterThanOrEqual(p.mid)
      expect(p.mid).toBeGreaterThanOrEqual(p.lower)
    }
  })
  it('常数列标准差为 0，三轨重合', () => {
    const flat = calcBOLL(series([5, 5, 5, 5, 5, 5]), 5)
    for (const p of flat) {
      expect(p.upper).toBeCloseTo(p.mid)
      expect(p.lower).toBeCloseTo(p.mid)
    }
  })
})

describe('calcMACD', () => {
  const macd = calcMACD(candles, 3, 5, 3)
  it('柱 = DIF − DEA，长度一致', () => {
    expect(macd.length).toBeGreaterThan(0)
    for (const p of macd) expect(p.hist).toBeCloseTo(p.dif - p.dea)
  })
  it('单调上涨序列 DIF > 0', () => {
    for (const p of macd) expect(p.dif).toBeGreaterThan(0)
  })
})

describe('calcKDJ', () => {
  const kdj = calcKDJ(candles, 3, 3, 3)
  it('K/D 落在 [0, 100]，J 可越界', () => {
    expect(kdj).toHaveLength(values.length)
    for (const p of kdj) {
      expect(p.k).toBeGreaterThanOrEqual(0)
      expect(p.k).toBeLessThanOrEqual(100)
      expect(p.d).toBeGreaterThanOrEqual(0)
      expect(p.d).toBeLessThanOrEqual(100)
      expect(p.j).toBeCloseTo(3 * p.k - 2 * p.d)
    }
  })
  it('单调上涨序列 K 快速逼近 100', () => {
    const last = kdj[kdj.length - 1]
    expect(last.k).toBeGreaterThan(90)
  })
})

describe('calcRSI', () => {
  it('全程上涨 → RSI = 100', () => {
    const rsi = calcRSI(candles, 3)
    expect(rsi.length).toBeGreaterThan(0)
    for (const p of rsi) expect(p.value).toBe(100)
  })
  it('全程下跌 → RSI = 0', () => {
    const rsi = calcRSI(series([10, 9, 8, 7, 6, 5, 4]), 3)
    for (const p of rsi) expect(p.value).toBe(0)
  })
  it('涨多于跌 → RSI > 50；跌多于涨 → RSI < 50', () => {
    const mostlyUp = series([10, 11, 12, 11, 13, 14, 13, 15, 16, 15, 17])
    const rsiUp = calcRSI(mostlyUp, 4)
    for (const p of rsiUp) expect(p.value).toBeGreaterThan(50)
    const mostlyDown = series([17, 16, 15, 16, 14, 13, 14, 12, 11, 12, 10])
    const rsiDown = calcRSI(mostlyDown, 4)
    for (const p of rsiDown) expect(p.value).toBeLessThan(50)
  })
  it('Wilder 平滑：震荡区间 RSI 落在 (0, 100)', () => {
    const noisy = series([10, 11, 9, 12, 8, 13, 7, 14, 6, 15, 9, 11, 8, 10, 12])
    const rsi = calcRSI(noisy, 4)
    for (const p of rsi) {
      expect(p.value).toBeGreaterThan(0)
      expect(p.value).toBeLessThan(100)
    }
  })
})
