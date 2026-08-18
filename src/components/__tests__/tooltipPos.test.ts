import { describe, expect, it } from 'vitest'
import { clampTooltipPos } from '../tooltipPos'

describe('clampTooltipPos（OHLC 十字光标浮层防溢出）', () => {
  it('中部：默认右下偏移（x+12 / y+8）', () => {
    const p = clampTooltipPos(100, 200, 5, 390, 844)
    expect(p.left).toBe(112)
    expect(p.top).toBe(208)
  })

  it('贴近底部：翻转到手指上方（纵向不溢出）', () => {
    // 容器高 844，y=791 → 下方放不下（估算高 ≈ (5+1)*17.6+16 = 121.6）
    const p = clampTooltipPos(100, 791, 5, 390, 844)
    expect(p.top + 121.6).toBeLessThanOrEqual(844 - 8)
    expect(p.top).toBeLessThan(791) // 翻到手指上方
    expect(p.left).toBe(112)
  })

  it('贴近顶部且下方空间不足：不翻转（保持下方，避免顶部溢出）', () => {
    // 容器高 200，y=10 → 上方空间不够翻转 → 保持 y+8
    const p = clampTooltipPos(100, 10, 5, 390, 200)
    expect(p.top).toBe(18)
  })

  it('贴近右缘：横向贴容器右缘防溢出', () => {
    const p = clampTooltipPos(360, 100, 5, 390, 844)
    expect(p.left).toBe(210) // 390 - 180
    expect(p.left + 180).toBeLessThanOrEqual(390)
  })

  it('容器极窄：横向至少留边距', () => {
    const p = clampTooltipPos(10, 100, 5, 100, 844)
    expect(p.left).toBe(8)
  })
})
