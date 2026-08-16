import { describe, expect, it } from 'vitest'
import { calcVWAP } from '../vwap'
import type { Candle } from '../../chart/types'

function c(time: number, open: number, high: number, low: number, close: number, volume: number): Candle {
  return { time, open, high, low, close, volume, isClosed: true }
}

const DAY = 86_400

describe('calcVWAP', () => {
  it('同日累计：VWAP = 累计典型价×量 / 累计量', () => {
    // 两根同日 K 线：t0 典型价 10 量 100；t1 典型价 20 量 100
    const candles = [
      c(DAY, 10, 10, 10, 10, 100),
      c(DAY + 60, 20, 20, 20, 20, 100),
    ]
    const vwap = calcVWAP(candles)
    expect(vwap[0].value).toBe(10)
    expect(vwap[1].value).toBe(15) // (10*100 + 20*100) / 200
  })

  it('跨日重置', () => {
    const candles = [
      c(DAY, 10, 10, 10, 10, 100),
      c(DAY + 60, 20, 20, 20, 20, 100),
      c(DAY * 2, 30, 30, 30, 30, 100), // 新的一天
    ]
    const vwap = calcVWAP(candles)
    expect(vwap[2].value).toBe(30) // 重置后从 30 开始
  })

  it('量加权：大量成交量主导 VWAP', () => {
    const candles = [
      c(DAY, 10, 10, 10, 10, 1),
      c(DAY + 60, 20, 20, 20, 20, 99),
    ]
    const vwap = calcVWAP(candles)
    expect(vwap[1].value).toBeCloseTo(19.9)
  })
})
