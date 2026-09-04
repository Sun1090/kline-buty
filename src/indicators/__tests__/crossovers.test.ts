import { describe, expect, it } from 'vitest'
import { annotateCrossovers, findCrossovers } from '../crossovers'
import type { ValuePoint } from '../sma'

describe('findCrossovers（H3 金叉/死叉检测）', () => {
  it('快线全程在慢线上方 → 无信号', () => {
    const fast: ValuePoint[] = [
      { time: 1, value: 11 },
      { time: 2, value: 12 },
      { time: 3, value: 13 },
    ]
    const slow: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 2, value: 10 },
      { time: 3, value: 10 },
    ]
    expect(findCrossovers(fast, slow)).toEqual([])
  })

  it('下穿 → 死叉', () => {
    // fast: 11 → 9 → 8；slow 恒 10
    const fast: ValuePoint[] = [
      { time: 1, value: 11 },
      { time: 2, value: 9 },
      { time: 3, value: 8 },
    ]
    const slow: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 2, value: 10 },
      { time: 3, value: 10 },
    ]
    const out = findCrossovers(fast, slow)
    expect(out).toEqual([{ time: 2, price: 10, kind: 'death' }])
  })

  it('先上穿后下穿 → 金叉 + 死叉', () => {
    // fast: 9 → 11 → 9 → 11
    const fast: ValuePoint[] = [
      { time: 1, value: 9 },
      { time: 2, value: 11 },
      { time: 3, value: 9 },
      { time: 4, value: 11 },
    ]
    const slow: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 2, value: 10 },
      { time: 3, value: 10 },
      { time: 4, value: 10 },
    ]
    const out = findCrossovers(fast, slow)
    expect(out.map((x) => x.kind)).toEqual(['golden', 'death', 'golden'])
  })

  it('时间不匹配（慢线缺根）→ 跳过该根不误报', () => {
    const fast: ValuePoint[] = [
      { time: 1, value: 9 },
      { time: 2, value: 11 },
      { time: 3, value: 13 },
    ]
    // 慢线缺 time=2
    const slow: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 3, value: 12 },
    ]
    // 因缺 time=2，prevDiff 在 2 处重置为 null；3 处 fast-slow=1>0 但无 prevDiff → 无信号
    expect(findCrossovers(fast, slow)).toEqual([])
  })

  it('恰好相等不算穿越（prevDiff 处理）', () => {
    const fast: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 2, value: 11 },
      { time: 3, value: 12 },
    ]
    const slow: ValuePoint[] = [
      { time: 1, value: 10 },
      { time: 2, value: 10 },
      { time: 3, value: 10 },
    ]
    // time=1 相等（diff=0），time=2 上穿 → 金叉（prevDiff>=0 且 diff>0）
    expect(findCrossovers(fast, slow)).toEqual([{ time: 2, price: 10, kind: 'golden' }])
  })

  it('空输入 → 空', () => {
    expect(findCrossovers([], [])).toEqual([])
  })
})

describe('annotateCrossovers（H14 回测买卖标注）', () => {
  it('金叉 → label B，死叉 → label S', () => {
    const signals = [
      { time: 10, price: 100, kind: 'golden' as const },
      { time: 20, price: 120, kind: 'death' as const },
    ]
    expect(annotateCrossovers(signals)).toEqual([
      { time: 10, price: 100, kind: 'golden', label: 'B' },
      { time: 20, price: 120, kind: 'death', label: 'S' },
    ])
  })

  it('保留原始顺序与字段', () => {
    const signals = [{ time: 5, price: 50, kind: 'golden' as const }]
    const out = annotateCrossovers(signals)
    expect(out[0]).toMatchObject({ time: 5, price: 50, kind: 'golden' })
    expect(out).toHaveLength(1)
  })

  it('空输入 → 空', () => {
    expect(annotateCrossovers([])).toEqual([])
  })
})
