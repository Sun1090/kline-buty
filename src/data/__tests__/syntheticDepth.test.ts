import { describe, expect, it } from 'vitest'
import { SYNTHETIC_DEPTH_LEVELS, generateSyntheticDepth } from '../syntheticDepth'

describe('generateSyntheticDepth 合成盘口', () => {
  it('中价非法（缺失/非正/非有限）→ null，不铺假档位', () => {
    for (const mid of [null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(generateSyntheticDepth(mid as number | null | undefined)).toBeNull()
    }
  })

  it('两端各 20 档：买价严格递减且都低于中价，卖价严格递增且都高于中价', () => {
    const snap = generateSyntheticDepth(50_000)!
    expect(snap.bids).toHaveLength(SYNTHETIC_DEPTH_LEVELS)
    expect(snap.asks).toHaveLength(SYNTHETIC_DEPTH_LEVELS)
    for (let i = 1; i < SYNTHETIC_DEPTH_LEVELS; i++) {
      expect(snap.bids[i].price).toBeLessThan(snap.bids[i - 1].price)
      expect(snap.asks[i].price).toBeGreaterThan(snap.asks[i - 1].price)
    }
    expect(snap.bids[0].price).toBeLessThan(50_000)
    expect(snap.asks[0].price).toBeGreaterThan(50_000)
  })

  it('数量全为正有限数（深度图与「档位填价」都依赖正量）', () => {
    const snap = generateSyntheticDepth(50_000)!
    for (const row of [...snap.bids, ...snap.asks]) {
      expect(Number.isFinite(row.quantity)).toBe(true)
      expect(row.quantity).toBeGreaterThan(0)
    }
  })

  it('确定性：同一中价两次调用完全一致（E2E 可依赖首档价格）', () => {
    expect(generateSyntheticDepth(63_250.5)).toEqual(generateSyntheticDepth(63_250.5))
  })

  it('档距随量级放大，小价位仍有可显示的最小变动单位', () => {
    const big = generateSyntheticDepth(50_000)!
    expect(big.asks[1].price - big.asks[0].price).toBeGreaterThanOrEqual(10)
    const small = generateSyntheticDepth(1)!
    expect(small.asks[1].price - small.asks[0].price).toBeGreaterThanOrEqual(0.01)
  })
})
