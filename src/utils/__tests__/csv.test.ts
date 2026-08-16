import { describe, expect, it } from 'vitest'
import type { Candle } from '../../chart/types'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'
import { buildCsv, csvFileName, escapeCsvField, fmtCsv, indicatorColumns, toCsv } from '../csv'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

const candles: Candle[] = [
  c(1_700_000_000, 100, 105, 99, 103, 1000),
  c(1_700_000_060, 103, 108, 102, 107, 1200),
  c(1_700_000_120, 107, 110, 105, 109, 1500),
]

const opts = {
  symbol: 'BTCUSDT',
  period: '1m' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  params: DEFAULT_INDICATOR_PARAMS,
}

describe('fmtCsv', () => {
  it('常规数值：默认 8 位小数去尾零', () => {
    expect(fmtCsv(123.456)).toBe('123.456')
    expect(fmtCsv(0.00000001)).toBe('0.00000001')
    expect(fmtCsv(42)).toBe('42')
  })
  it('空值/非有限数 → 空串', () => {
    expect(fmtCsv(null)).toBe('')
    expect(fmtCsv(undefined)).toBe('')
    expect(fmtCsv(Number.NaN)).toBe('')
    expect(fmtCsv(Number.POSITIVE_INFINITY)).toBe('')
  })
  it('-0 归一为 0', () => {
    expect(fmtCsv(-0)).toBe('0')
  })
})

describe('escapeCsvField / toCsv', () => {
  it('逗号/引号/换行字段包双引号，内嵌引号翻倍', () => {
    expect(escapeCsvField('abc')).toBe('abc')
    expect(escapeCsvField('a,b')).toBe('"a,b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField('a\nb')).toBe('"a\nb"')
  })
  it('toCsv：CRLF 行尾 + 数值走 fmtCsv', () => {
    const csv = toCsv([
      ['a', 'b,c'],
      [1.5, null],
    ])
    expect(csv).toBe('a,"b,c"\r\n1.5,\r\n')
  })
})

describe('indicatorColumns', () => {
  it('MA 主图 → MA5/10/20 列，3 根不足 5 期 → 全 null', () => {
    const cols = indicatorColumns(candles, opts)
    expect(cols.map((c) => c.header)).toEqual(['MA5', 'MA10', 'MA20'])
    for (const col of cols) expect(col.values.every((v) => v === null)).toBe(true)
  })
  it('MACD 副图 → DIF/DEA/MACD_HIST 三列', () => {
    const cols = indicatorColumns(candles, {
      ...opts,
      mainIndicator: 'none',
      subIndicator: 'macd',
    })
    expect(cols.map((c) => c.header)).toEqual(['DIF', 'DEA', 'MACD_HIST'])
    expect(cols).toHaveLength(3)
  })
})

describe('buildCsv', () => {
  it('头部 + 逐根 K 线（ISO 时间 + OHLCV），行数 = candles+1', () => {
    const csv = buildCsv(candles, opts)
    const lines = csv.trimEnd().split('\r\n')
    expect(lines[0]).toBe('time,open,high,low,close,volume,MA5,MA10,MA20')
    expect(lines).toHaveLength(candles.length + 1)
    expect(lines[1]).toMatch(/^2023-11-14T22:13:20\.000Z,100,105,99,103,1000,,,$/)
    expect(lines[2]).toContain(',103,108,102,107,1200,')
  })
  it('含指标列时指标值按时间对齐（RSI 生效后非空）', () => {
    // 构造 20 根单调数据，RSI(14) 末端应有值
    const mono: Candle[] = Array.from({ length: 20 }, (_, i) =>
      c(2_000_000_000 + i * 60, 100 + i, 101 + i, 99 + i, 100 + i + 0.5, 100),
    )
    const csv = buildCsv(mono, { ...opts, mainIndicator: 'none', subIndicator: 'rsi' })
    const lines = csv.trimEnd().split('\r\n')
    expect(lines[0]).toBe('time,open,high,low,close,volume,RSI')
    const last = lines[lines.length - 1].split(',')
    expect(Number(last[6])).not.toBeNaN()
  })
})

describe('csvFileName', () => {
  it('命名规则：SYMBOL_PERIOD_YYYYMMDD.csv', () => {
    expect(csvFileName('BTCUSDT', '1h', new Date('2026-08-16T00:00:00Z'))).toBe('BTCUSDT_1h_20260816.csv')
    expect(csvFileName('ETHUSDT', '1m', new Date('2026-01-05T00:00:00Z'))).toBe('ETHUSDT_1m_20260105.csv')
  })
})
