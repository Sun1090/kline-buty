import { describe, expect, it } from 'vitest'
import { applyTemplate, createTemplate, sortTemplates, uniqueTemplateName } from '../templates'
import { createDrawing, type Drawing } from '../logic'

function d(overrides: Partial<Drawing> = {}): Drawing {
  return createDrawing(overrides.type ?? 'trend', overrides.points ?? [{ time: 0, price: 100 }, { time: 100, price: 50 }])
}

describe('createTemplate 画线模板提取', () => {
  it('剥离 id 与图层状态，保留几何与样式', () => {
    const src: Drawing = {
      ...d(),
      id: 'abc-123',
      text: '支撑位',
      fontSize: 16,
      color: '#f5c02f',
      hidden: true,
      locked: true,
    }
    const tpl = createTemplate('支撑', [src])
    expect(tpl.name).toBe('支撑')
    expect(tpl.drawings[0]).not.toHaveProperty('id')
    expect(tpl.drawings[0]).not.toHaveProperty('hidden')
    expect(tpl.drawings[0]).not.toHaveProperty('locked')
    expect(tpl.drawings[0]).toMatchObject({ type: 'trend', text: '支撑位', fontSize: 16, color: '#f5c02f' })
    expect(tpl.drawings[0].points).toEqual(src.points)
  })

  it('空画线也能成模板（空集合）', () => {
    const tpl = createTemplate('空', [])
    expect(tpl.drawings).toEqual([])
  })

  it('createdAt 可注入（测试确定性）', () => {
    expect(createTemplate('a', [], 123).createdAt).toBe(123)
  })
})

describe('uniqueTemplateName 同名序号化', () => {
  it('无冲突保持原名', () => {
    expect(uniqueTemplateName('支撑线', new Set(['趋势']))).toBe('支撑线')
  })
  it('同名追加 (2) (3)…', () => {
    const set = new Set(['支撑线', '支撑线 (2)'])
    expect(uniqueTemplateName('支撑线', set)).toBe('支撑线 (3)')
  })
  it('空白名返回空白（交由 UI 拒绝）', () => {
    expect(uniqueTemplateName('   ', new Set())).toBe('')
  })
  it('trim 后判重', () => {
    const set = new Set(['支撑线'])
    expect(uniqueTemplateName(' 支撑线 ', set)).toBe('支撑线 (2)')
  })
})

describe('applyTemplate 套用模板', () => {
  it('保留原画线，追加模板画线并生成新 id', () => {
    const tpl = createTemplate('t', [d(), d({ type: 'fib', points: [{ time: 1, price: 10 }, { time: 2, price: 20 }] })])
    const current: Drawing[] = [d({ type: 'horizontal' })]
    const out = applyTemplate(current, tpl, () => 'gen-id')
    expect(out).toHaveLength(3)
    expect(out[0].type).toBe('horizontal') // 原画线保留
    expect(out[1].id).toBe('gen-id') // 新 id 注入
    expect(out[2].id).toBe('gen-id')
    // 模板画线内容完整（含类型）
    expect(out[2].type).toBe('fib')
  })

  it('空模板 = 原样返回（不产生多余画线）', () => {
    const tpl = createTemplate('t', [])
    const current: Drawing[] = [d()]
    expect(applyTemplate(current, tpl)).toEqual(current)
  })

  it('不修改入参数组（不可变）', () => {
    const tpl = createTemplate('t', [d()])
    const current: Drawing[] = [d()]
    const before = current.length
    applyTemplate(current, tpl)
    expect(current).toHaveLength(before)
  })
})

describe('sortTemplates 按创建时间', () => {
  it('升序排列', () => {
    const rec: Record<string, ReturnType<typeof createTemplate>> = {
      b: createTemplate('b', [], 200),
      a: createTemplate('a', [], 100),
      c: createTemplate('c', [], 150),
    }
    const sorted = sortTemplates(rec)
    expect(sorted.map((t) => t.name)).toEqual(['a', 'c', 'b'])
  })
})
