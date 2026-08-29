import { describe, expect, it } from 'vitest'
import { fmtPriceCompact, fmtPriceMedium, fmtPricePrecise, fmtVolumeBM, fmtVolumeMK } from '../format'

describe('fmtPricePrecise（高精度：十字光标/信息条）', () => {
  it('≥1000 两位小数', () => {
    expect(fmtPricePrecise(65432.1)).toBe('65432.10')
  })
  it('≥1 四位小数', () => {
    expect(fmtPricePrecise(3.5)).toBe('3.5000')
  })
  it('<1 六位小数', () => {
    expect(fmtPricePrecise(0.123456789)).toBe('0.123457')
  })
})

describe('fmtPriceCompact（紧凑：盘口/深度图）', () => {
  it('≥1000 一位小数', () => {
    expect(fmtPriceCompact(65432.4)).toBe('65432.4')
  })
  it('<1 两位小数', () => {
    expect(fmtPriceCompact(3.5)).toBe('3.50')
  })
})

describe('fmtPriceMedium（中精度：自选列表/筹码轴标）', () => {
  it('≥1000 整数', () => {
    expect(fmtPriceMedium(65432.15)).toBe('65432')
  })
  it('≥1 两位小数', () => {
    expect(fmtPriceMedium(3.5)).toBe('3.50')
  })
  it('<1 四位小数', () => {
    expect(fmtPriceMedium(0.1234)).toBe('0.1234')
  })
})

describe('fmtVolumeBM（B/M：24h 成交额）', () => {
  it('≥1e9 缩写 B', () => {
    expect(fmtVolumeBM(2_345_678_901)).toBe('2.35B')
  })
  it('≥1e6 缩写 M', () => {
    expect(fmtVolumeBM(1_234_567)).toBe('1.23M')
  })
  it('<1e6 整数', () => {
    expect(fmtVolumeBM(999_999)).toBe('999999')
  })
})

describe('fmtVolumeMK（M/K：十字光标成交量）', () => {
  it('≥1e6 缩写 M', () => {
    expect(fmtVolumeMK(2_345_678)).toBe('2.35M')
  })
  it('≥1e3 缩写 K', () => {
    expect(fmtVolumeMK(1_234)).toBe('1.23K')
  })
  it('<1e3 整数', () => {
    expect(fmtVolumeMK(999)).toBe('999')
  })
})
