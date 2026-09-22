import { describe, expect, it } from 'vitest'
import { EMPTY_POSITIONS, applyOrder, hasAny, mergePosition, planReduce, reverseSlot, settleSlot, slotFor, totalQuantity, type Positions } from '../positions'
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

  it('applyOrder 加仓保留既有止盈/止损/移动止损：不按新均价重算默认线', () => {
    const held: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 130, stopLoss: 118, trailPct: 1.5 }
    const next = applyOrder({ long: held, short: null }, 'buy', 200, 2)
    // 新均价 150，按默认 3%/2% 会给出 154.5 / 147 —— 那是把用户自己拖出来的线抹掉
    expect(next.long).toEqual({ entry: 150, quantity: 4, direction: 'long', takeProfit: 130, stopLoss: 118, trailPct: 1.5 })
  })

  it('applyOrder 首次建仓仍按成交价给出百分比参考价', () => {
    const next = applyOrder(EMPTY_POSITIONS, 'buy', 100, 2)
    expect(next.long).toEqual({ entry: 100, quantity: 2, direction: 'long', takeProfit: 103, stopLoss: 98 })
  })

  it('mergePosition：无既有持仓直接收下新仓；有则加权且沿用既有价位线与杠杆', () => {
    const opened: Position = { entry: 200, quantity: 2, direction: 'long', takeProfit: 206, stopLoss: 196, leverage: 5 }
    expect(mergePosition(null, opened)).toBe(opened)
    expect(mergePosition(undefined, opened)).toBe(opened)
    const existing: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 130, stopLoss: 118, trailPct: 1.5, leverage: 10 }
    expect(mergePosition(existing, opened)).toEqual({
      entry: 150,
      quantity: 4,
      direction: 'long',
      takeProfit: 130,
      stopLoss: 118,
      trailPct: 1.5,
      leverage: 10,
    })
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

describe('reverseSlot（v0.5.x 反手）', () => {
  it('平多开空：原多仓槽位置空，反向槽以同量现价开空', () => {
    const base: Positions = { long: longPos, short: null }
    const { next, closed } = reverseSlot(base, 'long', 120)
    expect(closed).toBe(longPos)
    expect(next.long).toBeNull()
    expect(next.short).not.toBeNull()
    expect(next.short!.direction).toBe('short')
    expect(next.short!.quantity).toBe(2) // 同量
    expect(next.short!.entry).toBe(120) // 现价
  })

  it('平空开多：反向槽以同量现价开多', () => {
    const base: Positions = { long: null, short: shortPos }
    const { next, closed } = reverseSlot(base, 'short', 90)
    expect(closed).toBe(shortPos)
    expect(next.short).toBeNull()
    expect(next.long!.direction).toBe('long')
    expect(next.long!.quantity).toBe(3)
    expect(next.long!.entry).toBe(90)
  })

  it('目标方向已有持仓 → 加权合并，不覆盖', () => {
    const base: Positions = { long: longPos, short: shortPos }
    const { next, closed } = reverseSlot(base, 'long', 200)
    expect(closed).toBe(longPos)
    expect(next.long).toBeNull()
    expect(next.short!.direction).toBe('short')
    // 原 short 3 手 @100 + 新反向 2 手 @200 → (100×3 + 200×2)/5 = 140
    expect(next.short!.quantity).toBe(5)
    expect(next.short!.entry).toBe(140)
    // 反向落进已有空仓：沿用该仓自己定的价位线（默认重算会是 135.8 / 142.8）
    expect(next.short).toMatchObject({ takeProfit: 97, stopLoss: 103 })
  })

  it('空槽位 → 原样返回（不新建）', () => {
    const { next, closed } = reverseSlot(EMPTY_POSITIONS, 'long', 100)
    expect(closed).toBeNull()
    expect(next).toBe(EMPTY_POSITIONS)
  })
})

describe('planReduce 部分平仓', () => {
  it('减半：返回减仓量与剩余持仓，价位线设置原样保留', () => {
    expect(planReduce(longPos, 1)).toEqual({ qty: 1, remaining: { ...longPos, quantity: 1 } })
    const t: Position = { entry: 100, quantity: 3, direction: 'long', trailPct: 2, takeProfit: 120, stopLoss: 110 }
    expect(planReduce(t, 1)!.remaining).toEqual({ ...t, quantity: 2 })
  })

  it('减到 0（含浮点尘）→ 剩余为 null，即整仓平掉', () => {
    expect(planReduce(longPos, 2)!.remaining).toBeNull()
    expect(planReduce(longPos, 2)!.qty).toBe(2)
    // 25% × 4 次累加后的尾差不应报「超过持仓量」
    expect(planReduce({ ...longPos, quantity: 4 }, 4 - 1e-12)!.remaining).toBeNull()
  })

  it('空头镜像：数量口径一致', () => {
    expect(planReduce(shortPos, 1.5)).toEqual({ qty: 1.5, remaining: { ...shortPos, quantity: 1.5 } })
  })

  it('非法数量（0 / 负数 / NaN / Infinity / 超过持仓）→ null', () => {
    expect(planReduce(longPos, 0)).toBeNull()
    expect(planReduce(longPos, -1)).toBeNull()
    expect(planReduce(longPos, NaN)).toBeNull()
    expect(planReduce(longPos, Infinity)).toBeNull()
    expect(planReduce(longPos, 2.5)).toBeNull()
  })

  it('按比例减仓的浮点结果保持可读（不写出 0.30000000000000004）', () => {
    const p: Position = { entry: 100, quantity: 0.3, direction: 'long' }
    const res = planReduce(p, 0.3 * 0.5)
    expect(res?.qty).toBe(0.15)
    expect(res?.remaining?.quantity).toBe(0.15)
  })

  it('不修改入参持仓对象', () => {
    planReduce(longPos, 1)
    expect(longPos.quantity).toBe(2)
  })
})
