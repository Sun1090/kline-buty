import { describe, expect, it } from 'vitest'
import { watermarkAnchor, watermarkFitSize } from '../adapter'

describe('watermarkAnchor（水印锚点）', () => {
  it('桌面横屏：主图区中心（42% 高度）', () => {
    const a = watermarkAnchor(1440, 812)
    expect(a.x).toBe(720)
    expect(a.y).toBeCloseTo(812 * 0.42)
  })

  it('移动竖屏：同样落在主图区上部', () => {
    const a = watermarkAnchor(390, 600)
    expect(a.x).toBe(195)
    expect(a.y).toBeCloseTo(600 * 0.42)
  })

  it('零尺寸容器不崩溃', () => {
    const a = watermarkAnchor(0, 0)
    expect(a.x).toBe(0)
    expect(a.y).toBe(0)
  })
})

describe('watermarkFitSize（字号自适应）', () => {
  it('短文案在宽容器内用基础字号', () => {
    expect(watermarkFitSize(1440, 10)).toBe(26)
  })

  it('长文案在窄容器内收缩但不低于 min', () => {
    const size = watermarkFitSize(390, 24)
    expect(size).toBeLessThan(26)
    expect(size).toBeGreaterThanOrEqual(12)
  })

  it('超窄容器收敛到 min 下限', () => {
    expect(watermarkFitSize(120, 50)).toBe(12)
  })

  it('字号估算不会让文本溢出容器 82%', () => {
    const text = '仅供学习参考 · 不构成投资建议'
    const w = 390
    const size = watermarkFitSize(w, text.length)
    const estWidth = size * 0.62 * text.length
    expect(estWidth).toBeLessThanOrEqual(w * 0.82 + 1)
  })
})
