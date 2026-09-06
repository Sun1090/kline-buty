import { describe, expect, it } from 'vitest'
import { histValueAtTime, lastHistValue, lastValuesOfLines, valuesAtTime } from '../lastValues'
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

describe('valuesAtTime（B1 十字光标取值）', () => {
  const lines = [
    { id: 'RSI', points: [{ time: 60, value: 40 }, { time: 80, value: 70 }, { time: 100, value: 55 }] as ValuePoint[] },
    { id: 'MA', points: [{ time: 60, value: 9 }, { time: 80, value: 8 }] as ValuePoint[] },
    { id: 'EMPTY', points: [] as ValuePoint[] },
  ]

  it('指定时刻精确命中 → 取该时刻值', () => {
    expect(valuesAtTime(lines, 80)).toEqual([
      { id: 'RSI', value: 70 },
      { id: 'MA', value: 8 },
    ])
  })

  it('时刻无线值（预热期/空白）→ 省略该线；空线跳过', () => {
    // time=90 仅 RSI 有? 无 → RSI 省略；MA 也无 → 空
    expect(valuesAtTime(lines, 90)).toEqual([])
    // time=60：RSI + MA 都有
    expect(valuesAtTime(lines, 60)).toEqual([
      { id: 'RSI', value: 40 },
      { id: 'MA', value: 9 },
    ])
  })

  it('空 lines → 空', () => {
    expect(valuesAtTime([], 42)).toEqual([])
  })
})

describe('histValueAtTime（B1 柱图十字光标取值）', () => {
  const hist = [
    { time: 100, value: 0.5 },
    { time: 60, value: -0.3 },
    { time: 80, value: 0.1 },
  ]
  it('命中时刻取值，未命中 → null', () => {
    expect(histValueAtTime(hist, 80)).toBe(0.1)
    expect(histValueAtTime(hist, 90)).toBeNull()
  })
  it('空 / undefined → null', () => {
    expect(histValueAtTime(undefined, 1)).toBeNull()
    expect(histValueAtTime([], 1)).toBeNull()
  })
})