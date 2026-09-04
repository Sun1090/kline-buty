import { describe, expect, it } from 'vitest'
import { mergeSubData } from '../mergeSubData'
import type { ValuePoint } from '../sma'

const mainLines: { id: string; points: ValuePoint[] }[] = [
  { id: 'K', points: [{ time: 1, value: 10 }] },
  { id: 'D', points: [{ time: 1, value: 8 }] },
]
const overlayLines: { id: string; points: ValuePoint[] }[] = [
  { id: 'RSI', points: [{ time: 1, value: 55 }] },
]

describe('mergeSubData（H10 副图叠加比较）', () => {
  it('main 为 null → null', () => {
    expect(mergeSubData(null, { lines: overlayLines })).toBeNull()
  })

  it('overlay 为 null → 返回 main 原引用', () => {
    const main = { kind: 'rsi', lines: mainLines }
    expect(mergeSubData(main, null)).toBe(main)
  })

  it('叠加 → lines 拼接（主图在前、叠加在后），hist/markers/zones 取主图', () => {
    const main = { kind: 'rsi', hist: [{ time: 1, value: 2, color: '#fff' }], lines: mainLines, markers: [{ price: 3, color: '#000' }] }
    const overlay = { hist: [{ time: 1, value: 99 }], lines: overlayLines, zones: [{ from: 0, to: 30, color: '#000' }] }
    const out = mergeSubData(main, overlay)
    expect(out!.lines).toHaveLength(3)
    expect(out!.lines!.map((l) => l.id)).toEqual(['K', 'D', 'RSI'])
    expect(out!.hist).toBe(main.hist) // 主图 hist 保留
    expect(out!.markers).toBe(main.markers)
    expect(out!.zones).toBeUndefined() // overlay zones 不并入
    expect(out!.kind).toBe('rsi') // 主图 kind 保留
  })

  it('overlay 无 lines（仅 hist）→ 不追加线', () => {
    const out = mergeSubData({ kind: 'rsi', lines: mainLines }, { hist: [{ time: 1, value: 5 }] })
    expect(out!.lines).toHaveLength(2)
  })
})
