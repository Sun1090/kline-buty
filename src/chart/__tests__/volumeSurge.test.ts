import { describe, expect, it } from 'vitest'
import { volumeSurgeRatio, isVolumeSurge } from '../volumeSurge'
import type { Candle } from '../types'

function c(time: number, volume: number): Candle {
  return { time, open: 1, high: 2, low: 1, close: 1.5, volume, isClosed: true }
}

describe('volumeSurgeRatio（G5 量能异动）', () => {
  it('数据不足 lookback+1 → null', () => {
    const cs = [c(1, 100), c(2, 100)]
    expect(volumeSurgeRatio(cs, 20)).toBeNull()
  })

  it('最新量 = 均量 → 1（无异动）', () => {
    // 前 20 根均 100，最新也 100 → ratio 1
    const cs = Array.from({ length: 21 }, (_, i) => c(i, 100))
    expect(volumeSurgeRatio(cs, 20)).toBeCloseTo(1)
  })

  it('最新量是均量 5 倍 → ratio 5', () => {
    const cs = Array.from({ length: 20 }, (_, i) => c(i, 100))
    cs.push(c(20, 500))
    expect(volumeSurgeRatio(cs, 20)).toBeCloseTo(5)
  })

  it('均量为 0（前 n 根无量）→ null 防除零', () => {
    const cs = Array.from({ length: 20 }, (_, i) => c(i, 0))
    cs.push(c(20, 100))
    expect(volumeSurgeRatio(cs, 20)).toBeNull()
  })
})

describe('isVolumeSurge（G5 阈值判定）', () => {
  it('≥ 阈值（默认 3×）→ true', () => {
    expect(isVolumeSurge(3)).toBe(true)
    expect(isVolumeSurge(5.2)).toBe(true)
  })
  it('< 阈值或 null → false', () => {
    expect(isVolumeSurge(2.9)).toBe(false)
    expect(isVolumeSurge(null)).toBe(false)
    expect(isVolumeSurge(1)).toBe(false)
  })
  it('自定义阈值生效', () => {
    expect(isVolumeSurge(2, 2)).toBe(true)
    expect(isVolumeSurge(1.9, 2)).toBe(false)
  })
})
