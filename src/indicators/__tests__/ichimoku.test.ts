import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { calcIchimoku, ichimokuCloud } from '../ichimoku'

/** n 根：high=i+1 / low=i-1 / close=i，可用公式直接推导各线中值 */
function candles(n = 60): Candle[] {
  return Array.from({ length: n }, (_, i) => ({
    time: i,
    open: i,
    high: i + 1,
    low: i - 1,
    close: i,
    volume: 1,
    isClosed: true,
  }))
}

describe('calcIchimoku', () => {
  it('转换线/基准线长度与起点正确', () => {
    const r = calcIchimoku(candles(), { periodSeconds: 1 })
    expect(r.tenkan).toHaveLength(60 - 8) // 9 周期
    expect(r.tenkan[0]).toEqual({ time: 8, value: 4 }) // (max9 + min-1)/2
    expect(r.kijun).toHaveLength(60 - 25) // 26 周期
    expect(r.kijun[0]).toEqual({ time: 25, value: 12.5 }) // (max26 + min-1)/2
  })

  it('spanA = (tenkan+kijun)/2 向未来平移 26 根', () => {
    const r = calcIchimoku(candles(), { periodSeconds: 1 })
    expect(r.spanA).toHaveLength(60 - 51)
    expect(r.spanA[0].time).toBe(51 + 26)
    expect(r.spanA[0].value).toBeCloseTo(51 - 8.25, 6)
  })

  it('spanB = 52 周期中值向未来平移 26 根', () => {
    const r = calcIchimoku(candles(), { periodSeconds: 1 })
    expect(r.spanB).toHaveLength(60 - 51)
    expect(r.spanB[0].time).toBe(77)
    expect(r.spanB[0].value).toBeCloseTo(51 - 25.5, 6)
  })

  it('迟行线 = 收盘价向过去平移 26 根', () => {
    const r = calcIchimoku(candles(), { periodSeconds: 1 })
    expect(r.chikou).toHaveLength(60 - 26)
    expect(r.chikou[0]).toEqual({ time: 26, value: 0 })
    expect(r.chikou[33]).toEqual({ time: 59, value: 33 })
  })

  it('不传 periodSeconds 时按索引对齐（末尾 26 根无未来时间则截断）', () => {
    const r = calcIchimoku(candles(100))
    // i ∈ [51, 73] 有未来时间（i+26 < 100），共 23 个点
    expect(r.spanA).toHaveLength(23)
    expect(r.spanA[0].time).toBe(77) // candles[51+26].time
    expect(r.spanA[22].time).toBe(99)
    expect(r.spanB.map((p) => p.time)).toEqual(r.spanA.map((p) => p.time))
  })

  it('云带：spanA/spanB 按时间对齐，上边界=较大者，本序列恒为多头', () => {
    const r = calcIchimoku(candles(), { periodSeconds: 1 })
    const cloud = ichimokuCloud(r)
    expect(cloud).toHaveLength(r.spanA.length)
    for (const p of cloud) {
      expect(p.bull).toBe(true) // spanA = i-8.25 > spanB = i-25.5
      expect(p.top).toBe(p.bull ? r.spanA[cloud.indexOf(p)].value : p.bottom)
    }
    expect(cloud[0]).toEqual({ time: 77, top: 42.75, bottom: 25.5, bull: true })
  })
})
