import { describe, expect, it } from 'vitest'
import { recommendIndicators } from '../recommend'

function candles(n: number, mk: (i: number) => { high: number; low: number; close: number }): { high: number; low: number; close: number }[] {
  return Array.from({ length: n }, (_, i) => mk(i))
}
const flat = candles(30, () => ({ high: 101, low: 99, close: 100 }))
const trending = candles(30, (i) => ({ high: 100 + i * 2, low: 100 + i * 2 - 1, close: 100 + i * 2 }))
const volatileCandles = candles(30, (i) => ({ high: 108, low: 92, close: 100 + Math.sin(i) }))

describe('recommendIndicators（I10 指标智能推荐）', () => {
  it('数据不足 → 保守 MA + Volume', () => {
    expect(recommendIndicators(flat.slice(0, 5))).toEqual({ main: 'ma', sub: 'volume', rationale: 'ranging' })
  })
  it('震荡 → MA + RSI', () => {
    expect(recommendIndicators(flat).main).toBe('ma')
    expect(recommendIndicators(flat).sub).toBe('rsi')
    expect(recommendIndicators(flat).rationale).toBe('ranging')
  })
  it('明显趋势 → EMA + MACD', () => {
    const r = recommendIndicators(trending)
    expect(r.main).toBe('ema')
    expect(r.sub).toBe('macd')
    expect(r.rationale).toBe('trending')
  })
  it('高波动 → BOLL + ATR', () => {
    const r = recommendIndicators(volatileCandles)
    expect(r.main).toBe('boll')
    expect(r.sub).toBe('atr')
    expect(r.rationale).toBe('volatile')
  })
})
