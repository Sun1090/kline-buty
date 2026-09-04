import { describe, expect, it } from 'vitest'
import { lastHistValue, lastValuesOfLines } from '../lastValues'
import type { ValuePoint } from '../sma'

describe('lastValuesOfLines（H9 指标值表取末尾值）', () => {
  it('取每组最后一点（按数组顺序）', () => {
    const lines = [
      { id: 'MA5', points: [{ time: 1, value: 10 }, { time: 2, value: 12 }] as ValuePoint[] },
      { id: 'MA20', points: [{ time: 1, value: 8 }, { time: 2, value: 9 }] as ValuePoint[] },
    ]
    expect(lastValuesOfLines(lines)).toEqual([
      { id: 'MA5', value: 12 },
      { id: 'MA20', value: 9 },
    ])
  })

  it('空线 → 跳过该线', () => {
    const lines = [
      { id: 'A', points: [] as ValuePoint[] },
      { id: 'B', points: [{ time: 1, value: 5 }] as ValuePoint[] },
    ]
    expect(lastValuesOfLines(lines)).toEqual([{ id: 'B', value: 5 }])
  })

  it('空数组 → 空', () => {
    expect(lastValuesOfLines([])).toEqual([])
  })
})

describe('lastHistValue（H9 柱图末尾值）', () => {
  it('取最后一点值', () => {
    expect(lastHistValue([{ time: 1, value: 0.5 }, { time: 2, value: -0.3 }])).toBe(-0.3)
  })
  it('空 / undefined → null', () => {
    expect(lastHistValue(undefined)).toBeNull()
    expect(lastHistValue([])).toBeNull()
  })
})