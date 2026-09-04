import { describe, expect, it } from 'vitest'
import { EMPTY_POSITIONS, applyOrder, hasAny, settleSlot, slotFor, totalQuantity, type Positions } from '../positions'
import type { Position } from '../../position/pnl'

const longPos: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 103, stopLoss: 98 }
const shortPos: Position = { entry: 100, quantity: 3, direction: 'short', takeProfit: 97, stopLoss: 103 }

describe('positions（J1 双向持仓纯函数）', () => {
  it('slotFor：buy→long / sell→short', () => {
    expect(slotFor('buy')).toBe('long')
    expect(slotFor('sell')).toBe('short')
  })

  it('applyOrder 无持仓 → 新建对应方向', () => {
    const next = applyOrder(EMPTY_POSITIONS, 'buy', 100, 2)
    expect(next.long).not.toBeNull()
    expect(next.long!.direction).toBe('long')
    expect(next.short).toBeNull()
  })

  it('applyOrder 同方向加仓 → 加权合并数量与均价', () => {
    const base: Positions = { long: longPos, short: null }
    const next = applyOrder(base, 'buy', 200, 2)
    expect(next.long!.quantity).toBe(4)
    expect(next.long!.entry).toBe(150) // (100×2 + 200×2)/4
  })

  it('hedge：buy 单只影响 long 槽，不影响 short 槽', () => {
    const base: Positions = { long: longPos, short: shortPos }
    const next = applyOrder(base, 'buy', 120, 1)
    expect(next.long!.quantity).toBe(3)
    expect(next.short).toBe(shortPos) // short 槽不变
  })

  it('双向并存：多空各自独立槽位', () => {
    let p: Positions = EMPTY_POSITIONS
    p = applyOrder(p, 'buy', 100, 2)
    p = applyOrder(p, 'sell', 90, 3)
    expect(p.long).not.toBeNull()
    expect(p.short).not.toBeNull()
    expect(p.long!.quantity).toBe(2)
    expect(p.short!.quantity).toBe(3)
    expect(hasAny(p)).toBe(true)
    expect(totalQuantity(p)).toBe(5)
  })

  it('settleSlot：结算某方向并置空该槽位', () => {
    const base: Positions = { long: longPos, short: shortPos }
    const { next, settled } = settleSlot(base, 'short')
    expect(settled).toBe(shortPos)
    expect(next.short).toBeNull()
    expect(next.long).toBe(longPos) // 另一方向不受影响
  })

  it('settleSlot 空槽位 → 原样返回', () => {
    const { next, settled } = settleSlot(EMPTY_POSITIONS, 'long')
    expect(settled).toBeNull()
    expect(next).toBe(EMPTY_POSITIONS)
  })

  it('EMPTY_POSITIONS 不共享可变引用（多空互不干扰）', () => {
    const next = applyOrder(EMPTY_POSITIONS, 'buy', 100, 1)
    expect(EMPTY_POSITIONS.long).toBeNull() // 原容器不变
    expect(next.long!.quantity).toBe(1)
  })
})
