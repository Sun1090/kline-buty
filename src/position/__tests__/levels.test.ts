import { describe, expect, it } from 'vitest'
import { applyLevels, breakevenStop, dragLevel, effectiveStopLoss, levelsOrdered, parseLevel, parseTrail } from '../levels'
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

  it('清除两条线、或只保留合理的单条线均通过', () => {
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
  it('两线次序判定', () => {
    expect(levelsOrdered('long', 120, 90)).toBe(true)
    expect(levelsOrdered('long', 90, 120)).toBe(false)
    expect(levelsOrdered('short', 90, 120)).toBe(true)
  })

  it('单条线也按方向校验（不再依赖另一条是否存在）', () => {
    // 无现价时止损上界是开仓价；有现价则可推到盈利区
    expect(applyLevels(long, { takeProfit: '', stopLoss: '110' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(long, { takeProfit: '', stopLoss: '110' }, 120).ok).toBe(true)
    expect(applyLevels(long, { takeProfit: '90', stopLoss: '' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(short, { takeProfit: '', stopLoss: '90' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(short, { takeProfit: '110', stopLoss: '' })).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('parseTrail 移动止损输入', () => {
  it('空白关闭，(0,100] 之外或非法视为错误', () => {
    expect(parseTrail('')).toBeNull()
    expect(parseTrail('  ')).toBeNull()
    expect(parseTrail('0.5')).toBe(0.5)
    expect(parseTrail('100')).toBe(100)
    expect(parseTrail('0')).toBeUndefined()
    expect(parseTrail('-1')).toBeUndefined()
    expect(parseTrail('101')).toBeUndefined()
    expect(parseTrail('abc')).toBeUndefined()
  })
})

describe('effectiveStopLoss 移动止损只朝有利方向推进', () => {
  it('未设 t 或价非法时沿用已存止损', () => {
    expect(effectiveStopLoss(long, 130)).toBe(90)
    const t = { ...long, trailPct: undefined }
    expect(effectiveStopLoss(t, 130)).toBe(90)
    expect(effectiveStopLoss({ ...long, trailPct: 2 }, null)).toBe(90)
    expect(effectiveStopLoss({ ...long, trailPct: 2 }, 0)).toBe(90)
  })

  it('多头：现价抬升则止损上移，现价回落则不回撤', () => {
    expect(effectiveStopLoss({ ...long, trailPct: 2 }, 200)).toBeCloseTo(196, 10)
    expect(effectiveStopLoss({ ...long, trailPct: 2 }, 120)).toBeCloseTo(117.6, 10)
    // 已推进到 196 后价格回落到 120：止损仍停在 196（此时即触发平仓）
    expect(effectiveStopLoss({ ...long, trailPct: 2, stopLoss: 196 }, 120)).toBe(196)
  })

  it('空头：镜像向下推进；无止损时以候选价为准', () => {
    expect(effectiveStopLoss({ ...short, trailPct: 10 }, 50)).toBeCloseTo(55, 10)
    expect(effectiveStopLoss({ ...short, trailPct: 10, stopLoss: 60 }, 50)).toBeCloseTo(55, 10)
    expect(effectiveStopLoss({ ...short, stopLoss: undefined, trailPct: 10 }, 50)).toBeCloseTo(55, 10)
    expect(effectiveStopLoss({ ...short, trailPct: 10, stopLoss: 40 }, 50)).toBe(40)
  })
})

describe('applyLevels 的 trail 字段', () => {
  it('设置移动止损百分比并保留其它字段', () => {
    const res = applyLevels(long, { takeProfit: '120', stopLoss: '90', trail: '2' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.position).toEqual({ ...long, trailPct: 2 })
  })

  it('空串关闭移动止损；不传该字段则保持原值', () => {
    const withTrail = { ...long, trailPct: 2 }
    const off = applyLevels(withTrail, { takeProfit: '120', stopLoss: '90', trail: '' })
    expect(off.ok && 'trailPct' in off.position).toBe(false)
    const untouched = applyLevels(withTrail, { takeProfit: '120', stopLoss: '90' })
    expect(untouched.ok && (untouched as { position: Position }).position.trailPct).toBe(2)
  })

  it('非法百分比 → invalid', () => {
    expect(applyLevels(long, { takeProfit: '120', stopLoss: '90', trail: '0' })).toEqual({ ok: false, error: 'invalid' })
    expect(applyLevels(long, { takeProfit: '120', stopLoss: '90', trail: '150' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('有现价时允许把止损保存到现价之下的盈利区（跟随移动止损后的值）', () => {
    expect(applyLevels(long, { takeProfit: '', stopLoss: '118', trail: '2' }, 120).ok).toBe(true)
    expect(applyLevels(long, { takeProfit: '', stopLoss: '125', trail: '2' }, 120)).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('dragLevel 图上拖拽价位线', () => {
  it('合法区间内直接落点，其余字段与移动止损保持不变', () => {
    const p: Position = { entry: 100, quantity: 1, direction: 'long', takeProfit: 150, stopLoss: 90, trailPct: 2 }
    expect(dragLevel(p, 'takeProfit', 180)).toEqual({ ...p, takeProfit: 180 })
    expect(dragLevel(p, 'stopLoss', 95, 120)).toEqual({ ...p, stopLoss: 95 })
    expect(p.takeProfit).toBe(150)
  })

  it('越到开仓价另一侧 → 拒绝（多头止盈不得低于开仓价、空头不得高于开仓价）', () => {
    expect(dragLevel(long, 'takeProfit', 90)).toBeNull()
    expect(dragLevel(short, 'takeProfit', 110)).toBeNull()
    // 无现价时多头止损上界是开仓价
    expect(dragLevel(long, 'stopLoss', 105)).toBeNull()
    expect(dragLevel(long, 'stopLoss', 100)).toEqual({ ...long, stopLoss: 100 })
  })

  it('有现价时止损可推进到现价下方的盈利区，越过现价仍拒绝', () => {
    expect(dragLevel(long, 'stopLoss', 118, 120)?.stopLoss).toBe(118)
    expect(dragLevel(long, 'stopLoss', 125, 120)).toBeNull()
    expect(dragLevel(short, 'stopLoss', 82, 80)?.stopLoss).toBe(82)
    expect(dragLevel(short, 'stopLoss', 75, 80)).toBeNull()
  })

  it('与另一条线交叉或重合 → 拒绝', () => {
    expect(dragLevel(long, 'takeProfit', 90)).toBeNull()
    expect(dragLevel(long, 'stopLoss', 120)).toBeNull()
    expect(dragLevel(long, 'stopLoss', 120, 200)).toBeNull()
    expect(dragLevel(short, 'stopLoss', 80)).toBeNull()
  })

  it('价非法（0 / 负数 / NaN / Infinity）→ 拒绝', () => {
    expect(dragLevel(long, 'takeProfit', 0)).toBeNull()
    expect(dragLevel(long, 'takeProfit', -5)).toBeNull()
    expect(dragLevel(long, 'takeProfit', NaN)).toBeNull()
    expect(dragLevel(long, 'takeProfit', Infinity)).toBeNull()
  })

  it('只有一条线时另一侧不设次序约束', () => {
    const onlyTp: Position = { entry: 100, quantity: 1, direction: 'long', takeProfit: 150 }
    expect(dragLevel(onlyTp, 'takeProfit', 120)).toEqual({ ...onlyTp, takeProfit: 120 })
    const onlySl: Position = { entry: 100, quantity: 1, direction: 'short', stopLoss: 130 }
    expect(dragLevel(onlySl, 'stopLoss', 118, 110)).toEqual({ ...onlySl, stopLoss: 118 })
  })
})
