import { describe, expect, it } from 'vitest'
import { computeVolumeProfile, pointOfControl, type VolumeProfileBucket } from '../calc'
import type { Candle } from '../../chart/types'

function c(time: number, open: number, high: number, low: number, close: number, volume: number): Candle {
  return { time, open, high, low, close, volume, isClosed: true }
}

describe('computeVolumeProfile', () => {
  it('单根大 K 线量分布到覆盖的桶', () => {
    const candles = [c(1, 100, 110, 90, 105, 60)]
    const profile = computeVolumeProfile(candles, 4)
    expect(profile).toHaveLength(4)
    // 90..110 范围 step=5，桶覆盖 lo(90)..hi(110)，span=4，每桶 15
    for (const b of profile) {
      expect(b.volume).toBeCloseTo(15)
    }
    // 涨 K → 全部记买量
    for (const b of profile) {
      expect(b.upVolume).toBeCloseTo(15)
      expect(b.downVolume).toBe(0)
    }
  })

  it('多根 K 线量正确累计且价格有序', () => {
    const candles = [
      c(1, 100, 110, 90, 105, 40),
      c(2, 100, 100, 90, 90, 20), // 只覆盖 90-100
    ]
    const profile = computeVolumeProfile(candles, 4)
    // 桶价格递增
    for (let i = 1; i < profile.length; i++) expect(profile[i].price).toBeGreaterThan(profile[i - 1].price)
    // 总成交量守恒
    const total = profile.reduce((s, b) => s + b.volume, 0)
    expect(total).toBeCloseTo(60)
  })

  it('跌 K 记卖量', () => {
    const candles = [c(1, 105, 110, 90, 90, 40)]
    const profile = computeVolumeProfile(candles, 4)
    for (const b of profile) {
      expect(b.downVolume).toBeCloseTo(10)
      expect(b.upVolume).toBe(0)
    }
  })

  it('空数据/平线返回空', () => {
    expect(computeVolumeProfile([], 10)).toHaveLength(0)
    expect(computeVolumeProfile([c(1, 100, 100, 100, 100, 5)], 10)).toHaveLength(0)
  })
})

describe('pointOfControl', () => {
  it('返回量最大的桶（筹码密集区）', () => {
    const profile: VolumeProfileBucket[] = [
      { price: 1, volume: 10, upVolume: 10, downVolume: 0 },
      { price: 2, volume: 100, upVolume: 100, downVolume: 0 },
      { price: 3, volume: 30, upVolume: 30, downVolume: 0 },
    ]
    expect(pointOfControl(profile)?.price).toBe(2)
  })
  it('空分布返回 null', () => {
    expect(pointOfControl([])).toBeNull()
  })
})
