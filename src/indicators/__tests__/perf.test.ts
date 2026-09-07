import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { calcSMA, calcEMA } from '../sma'
import { calcBOLL } from '../boll'
import { calcMACD } from '../macd'
import { calcKDJ } from '../kdj'
import { calcRSI } from '../rsi'
import { cullWindow, shouldCull } from '../../chart/cull'
import { downsampleCandles } from '../../chart/downsample'

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

  it('窗口裁剪热路径：20k 数据滚动 100 次 cullWindow 重算 < 10ms（滚动零重载依赖）', () => {
    const len = 20_000
    expect(shouldCull(len)).toBe(true)
    const t0 = performance.now()
    let w = cullWindow(len, { from: 8000, to: 9000 })
    for (let i = 1; i <= 100; i++) {
      w = cullWindow(len, { from: 8000 + i * 10, to: 9000 + i * 10 })
    }
    const elapsed = performance.now() - t0
    console.log(`  cullWindow×100: ${elapsed.toFixed(1)}ms`)
    expect(w.start).toBeGreaterThanOrEqual(0)
    expect(w.end).toBeLessThanOrEqual(len)
    expect(w.end - w.start).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(10)
  })
})

describe('G6/G15 渲染管线性能基线', () => {
  it('downsampleCandles：2 万 → 3000 根抽样 < 5ms（渲染前降采样热路径）', () => {
    const t0 = performance.now()
    const out = downsampleCandles(candles, 3000)
    const elapsed = performance.now() - t0
    console.log(`  downsample 20k→3k: ${elapsed.toFixed(3)}ms`)
    expect(out.length).toBe(3000)
    expect(elapsed).toBeLessThan(5)
  })

  it('全量指标 + 降采样 + 裁剪：单帧管线 < 200ms（大屏 5000+ 目标 p60 的预算拆解）', () => {
    // 模拟 2 万根的全量指标（MACD/KDJ/RSI）+ 降采样 + 裁剪组合
    const t0 = performance.now()
    calcMACD(candles)
    calcKDJ(candles)
    calcRSI(candles, 14)
    const sampled = downsampleCandles(candles, 5000)
    cullWindow(sampled.length, { from: 0, to: sampled.length })
    const elapsed = performance.now() - t0
    console.log(`  full pipeline (indicators+downsample+cull): ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(200)
  })
})
