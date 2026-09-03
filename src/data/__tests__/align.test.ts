import { describe, expect, it } from 'vitest'
import { alignTimeToPeriod } from '../align'

describe('alignTimeToPeriod（G1 时间戳对齐周期边界）', () => {
  it('整点时间戳保持不变', () => {
    // 2026-09-02 00:00:00 UTC = 1788307200s，正好是 1m/5m/1h 边界
    const t = 1_788_307_200
    expect(alignTimeToPeriod(t, '1m')).toBe(t)
    expect(alignTimeToPeriod(t, '5m')).toBe(t)
    expect(alignTimeToPeriod(t, '1h')).toBe(t)
  })

  it('非整分时间戳向下对齐到 1m', () => {
    const t = 1_788_307_200 + 90 // :01:30
    expect(alignTimeToPeriod(t, '1m')).toBe(t - 30)
  })

  it('非整 5m 时间戳对齐到 5m 边界', () => {
    const base = 1_788_307_200 // 00:00
    expect(alignTimeToPeriod(base + 300 * 2 + 42, '5m')).toBe(base + 600) // :10 之后 → 回 :10
  })

  it('非整 4h 时间戳对齐到 4h 边界', () => {
    const base = 1_788_307_200 // 00:00
    expect(alignTimeToPeriod(base + 14_400 * 3 + 7_200, '4h')).toBe(base + 14_400 * 3)
  })

  it('1d 对齐到当天 00:00', () => {
    const base = 1_788_307_200 // 00:00 UTC
    const noon = base + 12 * 3600
    expect(alignTimeToPeriod(noon, '1d')).toBe(base)
  })

  it('合成数据场景：起始时间非对齐时首根即对齐（向下取整）', () => {
    const t = 1_788_307_200 + 137 // 00:02:17 → 向下对齐到 00:02:00
    expect(alignTimeToPeriod(t, '1m')).toBe(1_788_307_200 + 120)
  })
})
