import { describe, expect, it } from 'vitest'
import { formatRemaining } from '../countdown'

describe('formatRemaining（周期收盘倒计时）', () => {
  it('<1h 显示 mm:ss', () => {
    expect(formatRemaining(5 * 60_000)).toBe('05:00')
    expect(formatRemaining(65_000)).toBe('01:05')
  })
  it('≥1h 显示 hh:mm:ss，≥24h 转天数前缀', () => {
    expect(formatRemaining(3_600_000)).toBe('01:00:00')
    expect(formatRemaining(27 * 3600_000 + 61_000)).toBe('1d 03:01:01')
  })
  it('跨天加 N d 前缀', () => {
    expect(formatRemaining(2 * 86400_000 + 3 * 3600_000)).toBe('2d 03:00:00')
  })
  it('负值与零钳为 00:00', () => {
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(-5_000)).toBe('00:00')
  })
})
