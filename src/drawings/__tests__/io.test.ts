import { describe, expect, it } from 'vitest'
import { parseDrawingsFile, serializeDrawings } from '../io'
import type { Drawing } from '../logic'

const sample: Drawing = {
  id: 'd1',
  type: 'horizontal',
  points: [{ time: 1700000000, price: 65000 }],
}

describe('serializeDrawings / parseDrawingsFile', () => {
  it('序列化 → 解析往返一致', () => {
    const json = serializeDrawings('BTCUSDT', [sample, { ...sample, id: 'd2', type: 'trend', points: [{ time: 1, price: 1 }, { time: 2, price: 2 }] }])
    const r = parseDrawingsFile(json, 'BTCUSDT', new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.imported).toBe(2)
      expect(r.drawings[0]).toEqual(sample)
    }
  })

  it('品种不匹配 → symbol 错误', () => {
    const r = parseDrawingsFile(serializeDrawings('ETHUSDT', [sample]), 'BTCUSDT', new Set())
    expect(r).toEqual({ ok: false, error: 'symbol' })
  })

  it('坏 JSON / 缺字段 → format 错误', () => {
    expect(parseDrawingsFile('{oops', 'BTCUSDT', new Set())).toEqual({ ok: false, error: 'format' })
    expect(parseDrawingsFile('{"version":2,"symbol":"BTCUSDT","drawings":[]}', 'BTCUSDT', new Set())).toEqual({ ok: false, error: 'format' })
    expect(parseDrawingsFile('{"version":1,"symbol":"BTCUSDT"}', 'BTCUSDT', new Set())).toEqual({ ok: false, error: 'format' })
  })

  it('结构过滤：非法点/缺 id 的条目跳过；NaN 价格跳过', () => {
    const json = JSON.stringify({
      version: 1,
      symbol: 'BTCUSDT',
      drawings: [
        sample,
        { id: '', type: 'trend', points: [{ time: 1, price: 1 }] },
        { id: 'bad-points', type: 'trend', points: [{ time: 'x', price: 1 }] },
        { id: 'nan', type: 'hline', points: [{ time: 1, price: Number.NaN }] },
        { id: 'ok2', type: 'note', points: [{ time: 3, price: 3 }], text: 'hi' },
      ],
    })
    const r = parseDrawingsFile(json, 'BTCUSDT', new Set())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.imported).toBe(2)
      expect(r.drawings[1]).toMatchObject({ id: 'ok2', text: 'hi' })
    }
  })

  it('与现有画线按 id 去重', () => {
    const json = serializeDrawings('BTCUSDT', [sample, { ...sample, id: 'd3' }])
    const r = parseDrawingsFile(json, 'BTCUSDT', new Set(['d1']))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.imported).toBe(1)
      expect(r.drawings[0].id).toBe('d3')
    }
  })
})
