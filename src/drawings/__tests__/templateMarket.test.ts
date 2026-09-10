import { describe, expect, it } from 'vitest'
import { createDrawing, type Drawing } from '../logic'
import { createTemplate } from '../templates'
import { mergeTemplates, parseTemplatesFile, serializeTemplates } from '../templateMarket'

const drawing = (id: string, price: number): Drawing => createDrawing('trend', [
  { time: 1700000000000, price },
  { time: 1700003600000, price: price + 100 },
], id)

describe('templateMarket I15', () => {
  it('空列表导出返回空串（调用方跳过下载）', () => {
    expect(serializeTemplates([])).toBe('')
  })

  it('导出→导入往返：几何与样式一致，剥离 id/hidden/locked', () => {
    const tmpl = createTemplate('趋势组', [
      { ...drawing('a', 100), hidden: true, locked: true },
    ])
    const json = serializeTemplates([tmpl])
    const r = parseTemplatesFile(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.imported).toBe(1)
    expect(r.templates[0].name).toBe('趋势组')
    expect(r.templates[0].drawings).toHaveLength(1)
    const d = r.templates[0].drawings[0] as Record<string, unknown>
    expect(d.type).toBe('trend')
    expect('id' in d).toBe(false)
    expect('hidden' in d).toBe(false)
    expect('locked' in d).toBe(false)
  })

  it('非法 JSON / 版本不符 / 非对象 → format 错误', () => {
    expect(parseTemplatesFile('{').ok).toBe(false)
    expect(parseTemplatesFile(JSON.stringify({ version: 99, templates: [] })).ok).toBe(false)
    expect(parseTemplatesFile('null').ok).toBe(false)
  })

  it('templates 非数组或全部无效条目 → format 错误', () => {
    expect(parseTemplatesFile(JSON.stringify({ version: 1, templates: 'x' })).ok).toBe(false)
    expect(parseTemplatesFile(JSON.stringify({ version: 1, templates: [{ name: '', drawings: [] }] })).ok).toBe(false)
    expect(parseTemplatesFile(JSON.stringify({ version: 1, templates: [{ name: 'a', drawings: [] }] })).ok).toBe(false)
    // 画线 points 非法 → 整条丢弃 → 全无效 → format
    const bad = JSON.stringify({
      version: 1,
      templates: [{ name: 'a', drawings: [{ type: 'trend', points: [{ time: 'x', price: 1 }] }] }],
    })
    expect(parseTemplatesFile(bad).ok).toBe(false)
  })

  it('部分合法条目：非法条目丢弃，合法条目保留', () => {
    const json = JSON.stringify({
      version: 1,
      templates: [
        { name: 'ok', createdAt: 123, drawings: [{ type: 'hray', points: [{ time: 1, price: 2 }] }] },
        'junk',
        { drawings: [{ type: 'hray', points: [{ time: 1, price: 2 }] }] },
        { name: 'ok', drawings: [{ type: 'rect', points: [{ time: 1, price: 2 }] }] },
      ],
    })
    const r = parseTemplatesFile(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.imported).toBe(1)
    expect(r.templates[0].createdAt).toBe(123)
  })

  it('样式白名单字段保留，未知字段不透传', () => {
    const json = JSON.stringify({
      version: 1,
      templates: [{
        name: 'styled',
        drawings: [{
          type: 'text', points: [{ time: 1, price: 2 }], text: 'hi', fontSize: 12, color: '#f00',
          textBg: '#00f', opacity: 0.5, textAlign: 'left', group: 'g', name: 'n',
          evil: 'drop-me',
        }],
      }],
    })
    const r = parseTemplatesFile(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = r.templates[0].drawings[0] as Record<string, unknown>
    expect(d.text).toBe('hi')
    expect(d.opacity).toBe(0.5)
    expect(d.textAlign).toBe('left')
    expect(d.group).toBe('g')
    expect(d.name).toBe('n')
    expect('evil' in d).toBe(false)
  })

  it('mergeTemplates：同名自动序号化，返回新增数量', () => {
    const existing = { foo: createTemplate('foo', [drawing('1', 1)]) }
    const incoming = [createTemplate('foo', [drawing('2', 2)]), createTemplate('bar', [drawing('3', 3)])]
    const { merged, added } = mergeTemplates(existing, incoming)
    expect(added).toBe(2)
    expect(Object.keys(merged).sort()).toEqual(['bar', 'foo', 'foo (2)'])
    expect(merged['foo (2)']?.name).toBe('foo (2)')
    // 原 foo 不被覆盖（模板画线已剥离 id，按 points 首价断言）
    expect((merged.foo.drawings[0] as { points: { price: number }[] }).points[0].price).toBe(1)
  })
})