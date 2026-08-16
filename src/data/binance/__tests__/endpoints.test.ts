import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildApiUrl, buildWsUrl, detectMode, __resetModeForTests } from '../endpoints'

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
