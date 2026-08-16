import { describe, expect, it } from 'vitest'
import { normalizeRegionRect } from '../adapter'

describe('normalizeRegionRect', () => {
  it('正向拖拽（左上 → 右下）', () => {
    expect(normalizeRegionRect({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual({
      x: 10,
      y: 20,
      w: 100,
      h: 50,
    })
  })

  it('反向拖拽（右下 → 左上）归一化为左上角 + 宽高', () => {
    expect(normalizeRegionRect({ x: 110, y: 70 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      w: 100,
      h: 50,
    })
  })

  it('横向拖拽（y 不变）', () => {
    const r = normalizeRegionRect({ x: 50, y: 40 }, { x: 20, y: 40 })
    expect(r).toEqual({ x: 20, y: 40, w: 30, h: 0 })
  })

  it('零尺寸（单击）', () => {
    const r = normalizeRegionRect({ x: 5, y: 5 }, { x: 5, y: 5 })
    expect(r.w).toBe(0)
    expect(r.h).toBe(0)
  })
})
