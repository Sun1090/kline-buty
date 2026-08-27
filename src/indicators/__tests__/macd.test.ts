import { describe, expect, it } from 'vitest'
import { calcMACD } from '../macd'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close, high: close, low: close, close, volume: 0, isClosed: true }
}

describe('calcMACD', () => {
  it('持续上涨 → DIF > 0（快线 > 慢线）', () => {
    const candles = Array.from({ length: 40 }, (_, i) => c(i + 1, 100 + i * 2))
    const out = calcMACD(candles)
    const last = out[out.length - 1]
    expect(last.dif).toBeGreaterThan(0)
  })

  it('持续下跌 → DIF < 0', () => {
    const candles = Array.from({ length: 40 }, (_, i) => c(i + 1, 200 - i * 2))
    const out = calcMACD(candles)
    const last = out[out.length - 1]
    expect(last.dif).toBeLessThan(0)
  })

  it('hist = DIF − DEA（柱状对齐）', () => {
    const candles = Array.from({ length: 40 }, (_, i) => c(i + 1, 100 + Math.sin(i * 0.5) * 10))
    const out = calcMACD(candles)
    for (const p of out) {
      expect(p.hist).toBeCloseTo(p.dif - p.dea, 6)
    }
  })

  it('先跌后涨 → 末期 hist 转正（DIF 回升上穿 DEA）', () => {
    // 先跌后涨，DIF 回升；持续上涨阶段 hist 最终为正
    const vals: number[] = []
    for (let i = 0; i < 20; i++) vals.push(200 - i * 3) // 跌
    for (let i = 0; i < 30; i++) vals.push(140 + i * 3) // 涨
    const candles = vals.map((v, i) => c(i + 1, v))
    const out = calcMACD(candles)
    // 上涨阶段足够长时，DIF > DEA → hist > 0
    const last = out[out.length - 1]
    expect(last.hist).toBeGreaterThan(0)
  })

  it('数据不足（< slow period）→ 空结果', () => {
    expect(calcMACD([c(1, 1), c(2, 2)], 12, 26, 9)).toEqual([])
  })

  it('空数组 → 空结果', () => {
    expect(calcMACD([])).toEqual([])
  })

  it('默认参数 fast=12/slow=26/signal=9', () => {
    // slow=26 → EMA slow 从 i=25 起；signal=9 → DEA 从 dif 的第 9 个起
    // 首产出约在 i=25+8=33 附近
    const candles = Array.from({ length: 40 }, (_, i) => c(i + 1, 100 + i))
    const out = calcMACD(candles)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(15)
  })

  it('time 字段透传', () => {
    const candles = Array.from({ length: 40 }, (_, i) => c(1000 + i, 100 + i))
    const out = calcMACD(candles)
    expect(out[0].time).toBeGreaterThanOrEqual(1000)
  })
})
