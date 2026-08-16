import { describe, expect, it } from 'vitest'
import { detectHover, resolveDragPrice, type PositionLineInfo } from '../dragState'

const lines: PositionLineInfo[] = [
  { key: 'entry', price: 100 },
  { key: 'takeProfit', price: 110 },
  { key: 'stopLoss', price: 95 },
]

/** 模拟主图：y = 300 - price（价格高 → y 小） */
const priceToY = (p: number) => 300 - p
const yToPrice = (y: number) => 300 - y

describe('detectHover', () => {
  it('命中最近的线', () => {
    expect(detectHover(300 - 100.5, lines, priceToY)).toBe('entry')
    expect(detectHover(300 - 110.2, lines, priceToY)).toBe('takeProfit')
    expect(detectHover(300 - 95.4, lines, priceToY)).toBe('stopLoss')
  })

  it('多线竞争取最近', () => {
    expect(detectHover(300 - 109.9, lines, priceToY)).toBe('takeProfit')
    expect(detectHover(300 - 100.1, lines, priceToY)).toBe('entry')
  })

  it('远离所有线 → null', () => {
    expect(detectHover(300 - 200, lines, priceToY)).toBeNull()
    expect(detectHover(0, lines, priceToY)).toBeNull()
  })

  it('坐标映射失败（线不可见）→ null', () => {
    expect(detectHover(200, lines, () => null)).toBeNull()
  })
})

describe('resolveDragPrice', () => {
  it('y → 价格', () => {
    expect(resolveDragPrice(200, yToPrice)).toBe(100)
  })
  it('映射失败/非法价格 → null', () => {
    expect(resolveDragPrice(200, () => null)).toBeNull()
    expect(resolveDragPrice(200, () => -5)).toBeNull()
    expect(resolveDragPrice(200, () => NaN)).toBeNull()
  })
})
