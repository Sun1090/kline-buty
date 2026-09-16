import { describe, expect, it } from 'vitest'
import { formatOhlc } from '../ohlc'

describe('formatOhlc', () => {
  it('格式化 O/H/L/C/V 紧凑文本', () => {
    expect(formatOhlc({ open: 100, high: 110, low: 95, close: 105.5, volume: 1234.5 }))
      .toBe('O:100 H:110 L:95 C:105.5 V:1234.5')
  })
  it('8 位小数去尾零', () => {
    expect(formatOhlc({ open: 100.1, high: 100.12345678, low: 99.9, close: 100.0, volume: 1 }))
      .toBe('O:100.1 H:100.12345678 L:99.9 C:100 V:1')
  })
  it('零值保留', () => {
    expect(formatOhlc({ open: 0, high: 0, low: 0, close: 0, volume: 0 }))
      .toBe('O:0 H:0 L:0 C:0 V:0')
  })
})
