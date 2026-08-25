import { describe, expect, it } from 'vitest'
import { calcSMA, calcMA, calcEMA } from '../sma'
import type { Candle } from '../../chart/types'

function c(time: number, close: number): Candle {
  return { time, open: close, high: close, low: close, close, volume: 0, isClosed: true }
}

const pts = (vals: number[]) => vals.map((v, i) => ({ time: i, value: v }))

describe('calcSMA', () => {
  it('period=3：从第 3 个点起输出（window 自 period-1 起有效）', () => {
    const out = calcSMA(pts([1, 2, 3, 4, 5]), 3)
    expect(out).toHaveLength(3)
    expect(out[0].value).toBe(2) // (1+2+3)/3
    expect(out[1].value).toBe(3) // (2+3+4)/3
    expect(out[2].value).toBe(4) // (3+4+5)/3
  })

  it('滚动窗口：新旧数据平滑替换（sum 加减正确）', () => {
    const out = calcSMA(pts([10, 20, 30, 0, 0]), 2)
    expect(out[0].value).toBe(15) // (10+20)/2
    expect(out[1].value).toBe(25) // (20+30)/2
    expect(out[2].value).toBe(15) // (30+0)/2
    expect(out[3].value).toBe(0) // (0+0)/2
  })

  it('空数组 → 空结果', () => {
    expect(calcSMA([], 3)).toEqual([])
  })

  it('数据量 < period → 空结果（不产出）', () => {
    expect(calcSMA(pts([1, 2]), 5)).toEqual([])
  })

  it('period=1 → 原值逐点输出', () => {
    const out = calcSMA(pts([5, 7, 9]), 1)
    expect(out.map((p) => p.value)).toEqual([5, 7, 9])
  })

  it('time 字段透传不丢', () => {
    const out = calcSMA(pts([1, 2, 3]), 2)
    expect(out.map((p) => p.time)).toEqual([1, 2])
  })
})

describe('calcMA（K 线 SMA 包装）', () => {
  it('取 close 价计算 SMA', () => {
    const candles = [c(1, 10), c(2, 20), c(3, 30)]
    const out = calcMA(candles, 3)
    expect(out).toHaveLength(1)
    expect(out[0].value).toBe(20) // (10+20+30)/3
    expect(out[0].time).toBe(3)
  })

  it('空 K 线 → 空结果', () => {
    expect(calcMA([], 5)).toEqual([])
  })
})

describe('calcEMA', () => {
  it('period-1 个点不产出（以 SMA 为种子）', () => {
    const out = calcEMA(pts([1, 2, 3, 4, 5]), 3)
    // i=0,1 < period-1=2 → 跳过；i=2 起产出
    expect(out).toHaveLength(3)
  })

  it('首产出 = 种子 SMA（period 内均价）', () => {
    const out = calcEMA(pts([2, 4, 6]), 3)
    expect(out[0].value).toBe(4) // (2+4+6)/3
  })

  it('后续点按 EMA 递推：v*k + prev*(1-k)', () => {
    const out = calcEMA(pts([2, 4, 6, 8]), 3)
    const k = 2 / (3 + 1) // 0.5
    // i=2: prev=4 (SMA 种子)
    // i=3: prev = 8*0.5 + 4*0.5 = 6
    expect(out[1].value).toBeCloseTo(8 * k + 4 * (1 - k))
  })

  it('空数组 → 空结果', () => {
    expect(calcEMA([], 3)).toEqual([])
  })

  it('数据量 < period → 空结果', () => {
    expect(calcEMA(pts([1, 2]), 5)).toEqual([])
  })
})
