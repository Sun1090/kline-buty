// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { favoriteFirst } from '../headerOptions'
import { loadIndicatorFavorites } from '../../hooks/useIndicatorFavorites'

describe('favoriteFirst（H15 指标收藏排序）', () => {
  const opts = [
    { value: 'volume', label: 'VOL' },
    { value: 'macd', label: 'MACD' },
    { value: 'rsi', label: 'RSI' },
    { value: 'none', labelKey: 'common.none' as const },
  ]

  it('收藏项排前，其余保持原序（收藏内 preserve options 序）', () => {
    const out = favoriteFirst(opts, ['rsi', 'volume'])
    // 收藏集合只决定「哪些靠前」，组内顺序仍按 options 原始顺序
    expect(out.map((o) => o.value)).toEqual(['volume', 'rsi', 'macd', 'none'])
  })

  it('无收藏 → 原序', () => {
    const out = favoriteFirst(opts, [])
    expect(out.map((o) => o.value)).toEqual(['volume', 'macd', 'rsi', 'none'])
  })

  it('收藏中的无效值被忽略（不出现也不影响顺序）', () => {
    const out = favoriteFirst(opts, ['bogus', 'macd'])
    expect(out.map((o) => o.value)).toEqual(['macd', 'volume', 'rsi', 'none'])
  })
})

describe('loadIndicatorFavorites（H15 收藏解析）', () => {
  it('null → 空', () => {
    expect(loadIndicatorFavorites(null)).toEqual([])
  })
  it('非法 JSON → 空', () => {
    expect(loadIndicatorFavorites('not json')).toEqual([])
  })
  it('非数组 → 空', () => {
    expect(loadIndicatorFavorites('{"a":1}')).toEqual([])
  })
  it('只保留字符串、去重、截断上限 12', () => {
    const raw = JSON.stringify(['macd', 5, 'kad', 'macd', ...Array.from({ length: 15 }, (_, i) => `x${i}`)])
    const out = loadIndicatorFavorites(raw)
    expect(out).toHaveLength(12)
    expect(out[0]).toBe('macd')
    expect(out[1]).toBe('kad')
    expect(new Set(out).size).toBe(out.length) // 无重复
  })
  it('空数组 → 空', () => {
    expect(loadIndicatorFavorites('[]')).toEqual([])
  })
})