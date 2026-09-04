import { describe, expect, it } from 'vitest'
import { applyLineColorOverrides, editableLineIds } from '../lineColors'

describe('applyLineColorOverrides（H11 线色自定义）', () => {
  const lines = [
    { id: 'MA5', points: [{ time: 1, value: 1 }] },
    { id: 'MA10', points: [{ time: 1, value: 1 }], color: '#4e9cf5' },
  ]

  it('覆盖有效 hex → 写入 color', () => {
    const out = applyLineColorOverrides(lines, { MA5: '#ff0000' })
    expect(out[0].color).toBe('#ff0000')
    // 未覆盖的线保持原样
    expect(out[1].color).toBe('#4e9cf5')
  })

  it('空串/非法值 → 不覆盖（保留原值）', () => {
    expect(applyLineColorOverrides(lines, { MA5: '' })[0].color).toBeUndefined()
    expect(applyLineColorOverrides(lines, { MA5: 'red' })[0].color).toBeUndefined()
    expect(applyLineColorOverrides(lines, { MA5: '#ff00' })[0].color).toBeUndefined()
  })

  it('不修改入参（返回新数组）', () => {
    const before = JSON.stringify(lines)
    applyLineColorOverrides(lines, { MA5: '#00ff00' })
    expect(JSON.stringify(lines)).toBe(before)
  })

  it('空 overrides → 原样返回', () => {
    expect(applyLineColorOverrides(lines, {})).toEqual(lines)
  })
})

describe('editableLineIds（H11 可调色线）', () => {
  it('MA 按周期展开 + 可选 EMA 叠加', () => {
    expect(editableLineIds('ma', 'none', [5, 10, 20])).toEqual(['MA5', 'MA10', 'MA20'])
    expect(editableLineIds('ma', 'none', [5], true)).toEqual(['MA5', 'EMA5'])
  })

  it('EMA / BOLL / Ichimoku / Supertrend 固定线', () => {
    expect(editableLineIds('ema', 'none', [5, 10])).toEqual(['EMA5', 'EMA10'])
    expect(editableLineIds('boll', 'none', [])).toEqual(['BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'])
    expect(editableLineIds('ichimoku', 'none', [])).toContain('ICH_SPANA')
    expect(editableLineIds('supertrend', 'none', [])).toEqual(['ST_UP', 'ST_DOWN'])
  })

  it('副图线（MACD/KDJ/DMI/Donchian）', () => {
    expect(editableLineIds('none', 'macd', [])).toEqual(['DIF', 'DEA'])
    expect(editableLineIds('none', 'kdj', [])).toEqual(['K', 'D', 'J'])
    expect(editableLineIds('none', 'dmi', [])).toEqual(['PDI', 'MDI', 'ADX'])
    expect(editableLineIds('none', 'donchian', [])).toEqual(['DC-U', 'DC-L', 'DC-BC'])
  })

  it('VOL 均量线仅在开启时列出', () => {
    expect(editableLineIds('none', 'volume', [], false, true)).toEqual(['VOL-MA'])
    expect(editableLineIds('none', 'volume', [], false, false)).toEqual([])
  })

  it('无 line 指标（SAR/AO/柱状）→ 空', () => {
    expect(editableLineIds('sar', 'none', [])).toEqual([])
    expect(editableLineIds('none', 'ao', [])).toEqual([])
    expect(editableLineIds('none', 'none', [])).toEqual([])
  })
})
