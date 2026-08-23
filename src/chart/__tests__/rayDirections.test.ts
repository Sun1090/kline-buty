import { describe, expect, it } from 'vitest'
import { horizontalRayDirection, verticalRayDirection } from '../adapter'

describe('射线方向纯函数', () => {
  it('水平射线固定向右：方向点在上方/下方都返回同一终点侧', () => {
    expect(horizontalRayDirection()).toBe(1)
  })

  it('垂直射线由第二点决定向上/向下', () => {
    expect(verticalRayDirection({ y: 100 }, { y: 80 })).toBe('up')
    expect(verticalRayDirection({ y: 100 }, { y: 120 })).toBe('down')
    expect(verticalRayDirection({ y: 100 }, { y: 100 })).toBe('down')
  })
})
