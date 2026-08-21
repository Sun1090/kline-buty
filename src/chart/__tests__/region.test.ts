import { describe, expect, it } from 'vitest'
import { normalizeRegionRect } from '../adapter'

describe('touchRegionRect（触屏区域选择坐标）', () => {
  it('client 坐标扣除容器 rect 后归一化为选区', () => {
    expect(
      normalizeRegionRect(
        { x: 80 - 10, y: 120 - 20 },
        { x: 180 - 10, y: 70 - 20 },
      ),
    ).toEqual({ x: 70, y: 50, w: 100, h: 50 })
  })

  it('零位移轻点不会产生有效选框', () => {
    const point = { x: 30, y: 40 }
    expect(normalizeRegionRect(point, point)).toEqual({ x: 30, y: 40, w: 0, h: 0 })
  })
})

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
