import { describe, expect, it } from 'vitest'
import { fmtPriceCompact, fmtPriceLocale, fmtPriceMedium, fmtPricePrecise, fmtVolumeBM, fmtVolumeMK, fmtAxisPrice } from '../format'

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

describe('fmtPriceLocale（E8 千分位国际化）', () => {
  it('en-US：≥1000 加逗号千分位 + 两位小数', () => {
    expect(fmtPriceLocale(65432.1, 'en-US')).toBe('65,432.1')
  })
  it('de-DE：千分位用点、小数用逗号', () => {
    expect(fmtPriceLocale(65432.1, 'de-DE')).toBe('65.432,1')
  })
  it('≥1 四位小数（去尾零）', () => {
    expect(fmtPriceLocale(3.5, 'en-US')).toBe('3.5')
  })
  it('<1 六位小数', () => {
    expect(fmtPriceLocale(0.123456789, 'en-US')).toBe('0.123457')
  })
  it('整数无小数部分不强制补零', () => {
    expect(fmtPriceLocale(5000, 'en-US')).toBe('5,000')
  })
})

describe('fmtAxisPrice（G13 坐标轴单位缩写）', () => {
  it('≥1e9 → B', () => {
    expect(fmtAxisPrice(1_234_567_890)).toBe('1.23B')
  })
  it('≥1e6 → M', () => {
    expect(fmtAxisPrice(1_500_000)).toBe('1.50M')
  })
  it('≥1e3 → k（一位小数）', () => {
    expect(fmtAxisPrice(65_000)).toBe('65.0k')
    expect(fmtAxisPrice(999_500)).toBe('999.5k')
  })
  it('<1e3 ≥1 → 两位小数', () => {
    expect(fmtAxisPrice(650)).toBe('650.00')
    expect(fmtAxisPrice(12.5)).toBe('12.50')
  })
  it('<1 → 四位小数', () => {
    expect(fmtAxisPrice(0.123456)).toBe('0.1235')
  })
  it('负数按绝对值判断量级', () => {
    expect(fmtAxisPrice(-1_234_567_890)).toBe('-1.23B')
    expect(fmtAxisPrice(-65_000)).toBe('-65.0k')
  })
})
