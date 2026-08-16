import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildApiUrl, buildDepthWsUrls, buildWsUrl, detectMode, toCoinMPair, toCoinMSymbol, __resetModeForTests } from '../endpoints'

afterEach(() => {
  vi.unstubAllGlobals()
  __resetModeForTests()
})

describe('buildApiUrl', () => {
  it('proxy 模式原样返回相对路径', () => {
    expect(buildApiUrl('proxy', '/api/v3/klines?a=1')).toBe('/api/v3/klines?a=1')
    expect(buildApiUrl('proxy', '/fapi/v1/openInterest')).toBe('/fapi/v1/openInterest')
  })
  it('direct 模式拼现货域名', () => {
    expect(buildApiUrl('direct', '/api/v3/klines?a=1')).toBe('https://data-api.binance.vision/api/v3/klines?a=1')
  })
  it('direct 模式拼永续域名', () => {
    expect(buildApiUrl('direct', '/fapi/v1/premiumIndex')).toBe('https://fapi.binance.com/fapi/v1/premiumIndex')
  })
  it('direct 模式拼衍生品情绪域名（/futures 走 fapi，带 CORS）', () => {
    expect(buildApiUrl('direct', '/futures/data/openInterestHist?symbol=BTCUSDT')).toBe(
      'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT',
    )
  })
  it('proxy 模式原样返回相对路径（含 /futures）', () => {
    expect(buildApiUrl('proxy', '/futures/data/openInterestHist')).toBe('/futures/data/openInterestHist')
  })
})

describe('buildWsUrl', () => {
  it('proxy 模式走相对路径', () => {
    expect(buildWsUrl('proxy', 'btcusdt@kline_1m')).toContain('/ws/btcusdt@kline_1m')
  })
  it('direct 模式直连 stream', () => {
    expect(buildWsUrl('direct', 'btcusdt@kline_1m')).toBe('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
  })
})

describe('detectMode', () => {
  it('ping 返回 JSON → proxy 模式', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
    }))
    expect(await detectMode()).toBe('proxy')
  })
  it('SPA fallback 返回 HTML → direct 模式', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
    }))
    expect(await detectMode()).toBe('direct')
  })
  it('网络错误 → direct 兜底', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await detectMode()).toBe('direct')
  })
  it('检测结果缓存，只请求一次', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
    })
    vi.stubGlobal('fetch', fetchMock)
    await detectMode()
    await detectMode()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('COIN-M 兜底映射', () => {
  it('toCoinMSymbol：USDT-M → COIN-M 永续（BTCUSDT → BTCUSD_PERP）', () => {
    expect(toCoinMSymbol('BTCUSDT')).toBe('BTCUSD_PERP')
    expect(toCoinMSymbol('ETHUSDT')).toBe('ETHUSD_PERP')
  })
  it('toCoinMPair：USDT-M → COIN-M pair（BTCUSDT → BTCUSD，futures/data 用 pair=）', () => {
    expect(toCoinMPair('BTCUSDT')).toBe('BTCUSD')
    expect(toCoinMPair('ETHUSDT')).toBe('ETHUSD')
  })
  it('非 USDT 后缀原样返回（不强行改写）', () => {
    expect(toCoinMSymbol('BTCUSDC')).toBe('BTCUSDC')
    expect(toCoinMPair('BTCUSDC')).toBe('BTCUSDC')
  })
})

describe('buildDepthWsUrls', () => {
  it('direct 模式：spot → fstream → dstream 候选链（流名同构/同构化）', () => {
    const urls = buildDepthWsUrls('direct', 'btcusdt@depth20@100ms', 'btcusd_perp@depth20@100ms')
    expect(urls).toEqual([
      'wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms',
      'wss://fstream.binance.com/ws/btcusdt@depth20@100ms',
      'wss://dstream.binance.com/ws/btcusd_perp@depth20@100ms',
    ])
  })
  it('direct 模式：无 coinm 流时仅前两个候选', () => {
    const urls = buildDepthWsUrls('direct', 'btcusdt@depth20@100ms')
    expect(urls).toHaveLength(2)
  })
  it('proxy 模式：单一相对路径', () => {
    expect(buildDepthWsUrls('proxy', 'btcusdt@depth20@100ms')[0]).toContain('/ws/btcusdt@depth20@100ms')
  })
})
