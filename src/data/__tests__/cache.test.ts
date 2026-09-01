// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  cacheKey,
  CACHE_TTL_MS,
  MIN_VALID_CANDLES,
  readCachedCandles,
  writeCachedCandles,
} from '../cache'
import type { Candle } from '../../chart/types'

function c(time: number, close = 100): Candle {
  return { time, open: close - 1, high: close + 1, low: close - 1, close, volume: 100, isClosed: true }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('cacheKey', () => {
  it('按品种×周期分键', () => {
    expect(cacheKey('BTCUSDT', '1m')).toBe('kline-cache:BTCUSDT:1m')
    expect(cacheKey('BTCUSDT', '1h')).toBe('kline-cache:BTCUSDT:1h')
    expect(cacheKey('ETHUSDT', '1m')).not.toBe(cacheKey('BTCUSDT', '1m'))
  })
})

describe('writeCachedCandles / readCachedCandles 冷启动秒开', () => {
  it('写入后立即读回（时间升序、字段完整）', () => {
    const candles = [c(1000), c(2000), c(3000)]
    writeCachedCandles('BTCUSDT', '1m', candles, 1000)
    const read = readCachedCandles('BTCUSDT', '1m', 1000 + 1000)
    expect(read).toHaveLength(3)
    expect(read![1].time).toBe(2000)
  })

  it('过期缓存返回 null（TTL 之外）', () => {
    const candles = [c(1000), c(2000)]
    writeCachedCandles('BTCUSDT', '1m', candles, 1000)
    expect(readCachedCandles('BTCUSDT', '1m', 1000 + CACHE_TTL_MS + 1)).toBeNull()
  })

  it('TTL 之内仍有效', () => {
    const candles = [c(1000), c(2000)]
    writeCachedCandles('BTCUSDT', '1m', candles, 1000)
    expect(readCachedCandles('BTCUSDT', '1m', 1000 + CACHE_TTL_MS - 1)).not.toBeNull()
  })

  it('写入不足 MIN_VALID_CANDLES 根：不写（读回 null）', () => {
    writeCachedCandles('BTCUSDT', '1m', [c(1000)], 1000)
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toBeNull()
  })

  it('非法 JSON 返回 null 并清除坏缓存', () => {
    window.localStorage.setItem(cacheKey('BTCUSDT', '1m'), '{broken json')
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toBeNull()
    expect(window.localStorage.getItem(cacheKey('BTCUSDT', '1m'))).toBeNull()
  })

  it('结构不合法（缺字段/字段非数值）返回 null', () => {
    const bad = JSON.stringify({ v: 1, fetchedAt: 1000, candles: [{ time: 1, open: 'x', high: 2, low: 0, close: 1, volume: 1 }] })
    window.localStorage.setItem(cacheKey('BTCUSDT', '1m'), bad)
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toBeNull()
  })

  it('high < low 的脏数据被拒绝', () => {
    const bad = JSON.stringify({ v: 1, fetchedAt: 1000, candles: [{ time: 1, open: 10, high: 5, low: 9, close: 10, volume: 1 }] })
    window.localStorage.setItem(cacheKey('BTCUSDT', '1m'), bad)
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toBeNull()
  })

  it('时间戳乱序被拒绝', () => {
    const candles = [c(3000), c(1000), c(2000)]
    writeCachedCandles('BTCUSDT', '1m', candles, 1000)
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toBeNull()
  })

  it('不同品种/周期缓存互不影响', () => {
    writeCachedCandles('BTCUSDT', '1m', [c(1000), c(2000)], 1000)
    expect(readCachedCandles('ETHUSDT', '1m', 1000)).toBeNull()
    expect(readCachedCandles('BTCUSDT', '1h', 1000)).toBeNull()
    expect(readCachedCandles('BTCUSDT', '1m', 1000)).toHaveLength(2)
  })

  it('MIN_VALID_CANDLES 导出为 2（常量契约）', () => {
    expect(MIN_VALID_CANDLES).toBe(2)
  })
})
