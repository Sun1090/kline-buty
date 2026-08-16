import { describe, expect, it } from 'vitest'
import { zoomRangeAround } from '../pinchZoom'

describe('zoomRangeAround（双指捏合纵向缩放）', () => {
  it('张开手指（factor>1）区间向中心收窄，中心价不动', () => {
    const r = zoomRangeAround(100, 50, 150, 2)
    expect(r.from).toBe(75) // 100 - (100-50)/2
    expect(r.to).toBe(125) // 100 + (150-100)/2
  })
  it('收拢手指（factor<1）区间向外放宽', () => {
    const r = zoomRangeAround(100, 75, 125, 0.5)
    expect(r.from).toBe(50)
    expect(r.to).toBe(150)
  })
  it('factor=1 区间不变', () => {
    const r = zoomRangeAround(100, 50, 150, 1)
    expect(r.from).toBe(50)
    expect(r.to).toBe(150)
  })
  it('中心偏下时上下边界按比例缩放', () => {
    // 中心价 80，原区间 [40,120]
    const r = zoomRangeAround(80, 40, 120, 2)
    expect(r.from).toBe(60)
    expect(r.to).toBe(100)
  })
})
