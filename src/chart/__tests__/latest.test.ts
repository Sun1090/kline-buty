import { describe, expect, it } from 'vitest'
import { isAwayFromLatest } from '../latest'

describe('isAwayFromLatest', () => {
  it('停在最新（to ≈ len-1+rightOffset）→ 不显示按钮', () => {
    expect(isAwayFromLatest(505, 500)).toBe(false) // len-1+6
    expect(isAwayFromLatest(499.4, 500)).toBe(false) // 距最新 0.6 根，超容差但仍 ≥ len-1
  })

  it('回看历史（to 低于 len-1）→ 显示按钮', () => {
    expect(isAwayFromLatest(480, 500)).toBe(true)
    expect(isAwayFromLatest(400, 500)).toBe(true)
    expect(isAwayFromLatest(0, 500)).toBe(true)
  })

  it('数据不足/边界不显示', () => {
    expect(isAwayFromLatest(0, 0)).toBe(false)
    expect(isAwayFromLatest(0, 1)).toBe(false)
    expect(isAwayFromLatest(-5, 1)).toBe(false)
  })

  it('自定义容差', () => {
    expect(isAwayFromLatest(497, 500, 4)).toBe(false) // 距最新 2 根 < 容差 4
    expect(isAwayFromLatest(490, 500, 4)).toBe(true) // 距最新 9 根 > 容差 4
  })
})
