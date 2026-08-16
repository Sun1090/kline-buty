import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { calcSMA, calcEMA } from '../sma'
import { calcBOLL } from '../boll'
import { calcMACD } from '../macd'
import { calcKDJ } from '../kdj'
import { calcRSI } from '../rsi'

const N = 20_000

const candles: Candle[] = Array.from({ length: N }, (_, i) => {
  const base = 50000 + Math.sin(i / 200) * 5000 + Math.sin(i / 7) * 30
  return {
    time: i * 60,
    open: base,
    high: base + 50,
    low: base - 50,
    close: base + Math.sin(i / 13) * 20,
    volume: 100 + (i % 97),
    isClosed: true,
  }
})
const closes = candles.map((c) => ({ time: c.time, value: c.close }))

/** 性能基线：2 万根 K 线（≈1m 周期 14 天 / 5m 周期 10 周），单次全量计算预算 */
describe('指标引擎性能基线（20k 根）', () => {
  const cases: [string, () => unknown, number][] = [
    ['SMA(5)', () => calcSMA(closes, 5), 20],
    ['EMA(12)', () => calcEMA(closes, 12), 20],
    ['BOLL(20,2)', () => calcBOLL(candles, 20, 2), 30],
    ['MACD(12,26,9)', () => calcMACD(candles), 50],
    ['KDJ(9,3,3)', () => calcKDJ(candles), 80],
    ['RSI(14)', () => calcRSI(candles, 14), 30],
  ]

  for (const [name, fn, budgetMs] of cases) {
    it(`${name} 单次全量 < ${budgetMs}ms`, () => {
      const t0 = performance.now()
      const out = fn() as { length: number }
      const elapsed = performance.now() - t0
      console.log(`  ${name}: ${elapsed.toFixed(1)}ms (${N} 根)`)
      expect(out.length).toBeGreaterThan(0)
      expect(elapsed).toBeLessThan(budgetMs)
    })
  }

  it('实时流典型刷新：2 万根全指标 + 蜡烛全量装载 < 250ms', () => {
    const t0 = performance.now()
    calcSMA(closes, 5)
    calcSMA(closes, 60)
    calcEMA(closes, 12)
    calcEMA(closes, 26)
    calcBOLL(candles, 20, 2)
    calcMACD(candles)
    calcKDJ(candles)
    calcRSI(candles, 14)
    const elapsed = performance.now() - t0
    console.log(`  全部指标一次刷新: ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(250)
  })
})
