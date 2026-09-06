import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { alignTimeToPeriod, normalizeCandles, periodSpanMs } from '../align'

const mk = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m, d, h, mi) / 1000

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

  it('1w：对齐到 UTC 周一 00:00（epoch 是周四，固定 7 天倍数会错位）', () => {
    // 1970-01-05 是周一 → 本身不变（公式 shift=3 天，已验证）
    expect(alignTimeToPeriod(mk(1970, 0, 5), '1w')).toBe(mk(1970, 0, 5))
    // epoch（周四 1970-01-01）→ 所属周周一 = 1969-12-29
    expect(alignTimeToPeriod(0, '1w')).toBe(mk(1969, 11, 29))
    // 2000-01-03 周一 + 123s → 仍在当周
    expect(alignTimeToPeriod(mk(2000, 0, 3) + 123, '1w')).toBe(mk(2000, 0, 3))
    // 非周一任意时间落回本周一
    for (const t of [mk(2026, 8, 6), mk(2026, 0, 1), mk(2025, 11, 31)]) {
      const out = alignTimeToPeriod(t, '1w')
      // 结果是周一且不晚于输入、不隔出超一周
      expect(new Date(out * 1000).getUTCDay()).toBe(1)
      expect(out).toBeLessThanOrEqual(t)
      expect(t - out).toBeLessThan(7 * 86_400)
    }
  })

  it('1M：对齐到当月 1 日 00:00 UTC', () => {
    expect(alignTimeToPeriod(mk(2026, 8, 17, 13, 45), '1M')).toBe(mk(2026, 8, 1))
    expect(alignTimeToPeriod(mk(2026, 11, 20), '1M')).toBe(mk(2026, 11, 1)) // 12 月跨年
    expect(alignTimeToPeriod(mk(2031, 0, 15, 23, 59), '1M')).toBe(mk(2031, 0, 1))
  })

  it('1M：闰年 2 月 29 → 2 月 1 日（不能按 30 天近似）', () => {
    expect(alignTimeToPeriod(mk(2024, 1, 29, 8), '1M')).toBe(mk(2024, 1, 1))
  })
})

describe('normalizeCandles（A1 数据流唯一入口）', () => {
  const base = 1_788_307_200 // 2026-09-02 00:00:00 UTC
  const candle = (time: number, close: number): Candle => ({
    time,
    open: 1,
    high: 2,
    low: 0.5,
    close,
    volume: 1,
    isClosed: true,
  })

  it('非对齐输入 → 逐根对齐到周期边界', () => {
    const out = normalizeCandles(
      [candle(base + 90, 1), candle(base + 30, 2), candle(base + 150, 3)],
      '1m',
    )
    expect(out.map((c) => c.time)).toEqual([base, base + 60, base + 120])
  })

  it('乱序输入 → 升序输出', () => {
    const out = normalizeCandles([candle(base + 180, 4), candle(base + 60, 2), candle(base, 1)], '1m')
    expect(out.map((c) => c.time)).toEqual([base, base + 60, base + 180])
  })

  it('对齐后同时间戳去重 → 保留末值', () => {
    // base+30 与 base+59 都在 <:01:00 → 对齐后同为 base；后者在后 → 保留其 close
    const out = normalizeCandles([candle(base + 30, 2), candle(base + 59, 9)], '1m')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ time: base, close: 9 })
  })

  it('1M：同一自然月内非对齐时间戳合并为月初一根', () => {
    const out = normalizeCandles([candle(mk(2026, 8, 5), 1), candle(mk(2026, 8, 27), 2)], '1M')
    expect(out).toHaveLength(1)
    expect(out[0].time).toBe(mk(2026, 8, 1))
  })
})

describe('periodSpanMs（分页/补洞窗口宽度）', () => {
  it('非 1M：count × 周期毫秒', () => {
    expect(periodSpanMs('1m', 500)).toBe(500 * 60_000)
    expect(periodSpanMs('1h', 10)).toBe(10 * 3_600_000)
  })

  it('1M：用 31 天上界（31 天 ≥ 任一月长，保证窗口覆盖 ≥count 根）', () => {
    expect(periodSpanMs('1M', 500)).toBe(500 * 31 * 86_400_000)
  })
})
