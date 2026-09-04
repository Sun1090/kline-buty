import { describe, expect, it } from 'vitest'
import { workerSubLines } from '../workerLines'
import { DEFAULT_INDICATOR_PARAMS } from '../params'
import type { Candle } from '../../chart/types'

function candles(n: number, base = 100): Candle[] {
  const out: Candle[] = []
  let close = base
  for (let i = 0; i < n; i++) {
    close += i % 3 === 0 ? 1 : -0.5
    out.push({
      time: i + 1,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + i,
      isClosed: true,
    })
  }
  return out
}

describe('workerSubLines（H13 worker 可序列化指标线）', () => {
  const data = candles(60)

  it('RSI → 单线 RSI', () => {
    const lines = workerSubLines('rsi', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines).toHaveLength(1)
    expect(lines![0].id).toBe('RSI')
    expect(lines![0].points.length).toBeGreaterThan(0)
  })

  it('MACD → DIF/DEA 双线（不含 hist）', () => {
    const lines = workerSubLines('macd', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines!.map((l) => l.id)).toEqual(['DIF', 'DEA'])
  })

  it('KDJ → K/D/J 三线', () => {
    const lines = workerSubLines('kdj', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines!.map((l) => l.id)).toEqual(['K', 'D', 'J'])
  })

  it('Donchian → DC-U/DC-L/DC-BC 三线', () => {
    const lines = workerSubLines('donchian', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines!.map((l) => l.id)).toEqual(['DC-U', 'DC-L', 'DC-BC'])
  })

  it('Aroon → A-U/A-D 双线', () => {
    const lines = workerSubLines('aroon', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines!.map((l) => l.id)).toEqual(['A-U', 'A-D'])
  })

  it('AO → 单线 AO（hist 形态由主线程补色）', () => {
    const lines = workerSubLines('ao', data, DEFAULT_INDICATOR_PARAMS)
    expect(lines).toHaveLength(1)
    expect(lines![0].id).toBe('AO')
  })

  it('不支持（volume/bbw/dmi/cci 等未纳入线集）→ null', () => {
    for (const k of ['volume', 'bbw', 'dmi', 'cci', 'stoch', 'obv', 'wr', 'psy', 'roc', 'mom']) {
      expect(workerSubLines(k, data, DEFAULT_INDICATOR_PARAMS)).toBeNull()
    }
  })

  it('纯函数：入参不可变（不修改 candles）', () => {
    const snapshot = JSON.stringify(data)
    workerSubLines('rsi', data, DEFAULT_INDICATOR_PARAMS)
    expect(JSON.stringify(data)).toBe(snapshot)
  })
})
