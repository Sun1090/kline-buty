// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { exportDisclaimerLayout } from '../exportDisclaimer'

describe('exportDisclaimerLayout（导出声明布局）', () => {
  it('常规宽度使用 12px 字号，角标贴右下并保留边距', () => {
    const textWidth = 180
    const size = exportDisclaimerLayout(1200, 800, textWidth)
    expect(size.fontSize).toBe(12)
    expect(size.badge.w).toBe(textWidth + size.paddingX * 2)
    expect(size.badge.x).toBe(1200 - size.badge.w - 8)
    expect(size.badge.y).toBe(800 - size.badge.h - 6)
  })

  it('窄截图收敛到最小字号，避免遮挡主图', () => {
    const textWidth = 160
    const size = exportDisclaimerLayout(220, 120, textWidth)
    expect(size.fontSize).toBe(9)
    expect(size.badge.w).toBeGreaterThan(0)
    expect(size.badge.x).toBeGreaterThanOrEqual(6)
    expect(size.badge.y).toBeGreaterThanOrEqual(6)
  })

  it('零尺寸或空文案不产生越界角标', () => {
    const size = exportDisclaimerLayout(0, 0, 100)
    expect(size.badge.w).toBeGreaterThan(0)
    expect(size.badge.x).toBe(6)
    expect(size.badge.y).toBe(6)

    const empty = exportDisclaimerLayout(300, 200, 0)
    expect(empty.badge.w).toBe(empty.paddingX * 2)
  })
})
