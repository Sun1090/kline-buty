import { describe, expect, it } from 'vitest'
import { applyLevels, breakevenStop, levelsOnCorrectSide, levelsOrdered, parseLevel } from '../levels'
import type { Position } from '../../position/pnl'

const long: Position = { entry: 100, quantity: 1, direction: 'long', takeProfit: 120, stopLoss: 90 }
const short: Position = { entry: 100, quantity: 1, direction: 'short', takeProfit: 80, stopLoss: 110 }

describe('parseLevel 价位输入', () => {
  it('空串/纯空白表示清除，非正数与非有限数为非法', () => {
    expect(parseLevel('')).toBeNull()
    expect(parseLevel('   ')).toBeNull()
    expect(parseLevel('120.5')).toBe(120.5)
    expect(parseLevel('0')).toBeUndefined()
    expect(parseLevel('-5')).toBeUndefined()
    expect(parseLevel('abc')).toBeUndefined()
    expect(parseLevel('Infinity')).toBeUndefined()
  })
})

describe('applyLevels 编辑已开仓位的止盈止损', () => {
  it('多头改两条线：返回新持仓且不改入参', () => {
    const res = applyLevels(long, { takeProfit: '150', stopLoss: '95' })
    expect(res).toEqual({ ok: true, position: { ...long, takeProfit: 150, stopLoss: 95 } })
    expect(long.takeProfit).toBe(120)
  })

  it('空串清除对应线', () => {
    const res = applyLevels(long, { takeProfit: '', stopLoss: '95' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect('takeProfit' in res.position).toBe(false)
      expect(res.position.stopLoss).toBe(95)
    }
  })

  it('非法输入（0 / 文本）→ invalid', () => {
    expect(applyLevels(long, { takeProfit: '0', stopLoss: '95' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(long, { takeProfit: '150', stopLoss: 'x' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('多头方向错置（止盈低于开仓价 / 止损高于开仓价）→ invalid', () => {
    expect(applyLevels(long, { takeProfit: '80', stopLoss: '70' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(long, { takeProfit: '150', stopLoss: '110' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('空头方向镜像：止盈须低于开仓价、止损须高于开仓价', () => {
    expect(applyLevels(short, { takeProfit: '70', stopLoss: '105' }).ok).toBe(true)
    expect(applyLevels(short, { takeProfit: '120', stopLoss: '105' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('两条线交叉或重合 → crossed；方向先错则报 invalid', () => {
    // 多头两线都落在合理侧时只可能重合于开仓价，此时止盈不高于止损
    expect(applyLevels(long, { takeProfit: '100', stopLoss: '100' })).toEqual({ ok: false, error: 'crossed' })
    expect(applyLevels(short, { takeProfit: '100', stopLoss: '100' })).toEqual({ ok: false, error: 'crossed' })
    expect(applyLevels(long, { takeProfit: '90', stopLoss: '80' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(short, { takeProfit: '105', stopLoss: '102' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('保本止损（等于开仓价）合法', () => {
    expect(applyLevels(long, { takeProfit: '120', stopLoss: '100' }).ok).toBe(true)
    expect(applyLevels(short, { takeProfit: '80', stopLoss: '100' }).ok).toBe(true)
  })

  it('只清除一条线时不做方向校验（单线不设限）', () => {
    expect(applyLevels(long, { takeProfit: '', stopLoss: '' }).ok).toBe(true)
    expect(applyLevels(long, { takeProfit: '120', stopLoss: '' }).ok).toBe(true)
  })
})

describe('breakevenStop 一键保本止损', () => {
  it('把止损推到开仓价并保留止盈', () => {
    expect(breakevenStop(long)).toEqual({ ...long, stopLoss: 100 })
    expect(breakevenStop(short)).toEqual({ ...short, stopLoss: 100 })
  })
})

describe('levels 校验原语', () => {
  it('方向合理侧判定', () => {
    expect(levelsOnCorrectSide('long', 100, 120, 90)).toBe(true)
    expect(levelsOnCorrectSide('long', 100, 90, 120)).toBe(false)
    expect(levelsOnCorrectSide('short', 100, 90, 120)).toBe(true)
  })

  it('两线次序判定', () => {
    expect(levelsOrdered('long', 120, 90)).toBe(true)
    expect(levelsOrdered('long', 90, 120)).toBe(false)
    expect(levelsOrdered('short', 90, 120)).toBe(true)
  })
})
