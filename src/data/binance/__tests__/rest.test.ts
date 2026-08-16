import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFundingRate,
  fetchGlobalLongShortRatio,
  fetchKlines,
  fetchOpenInterest,
  fetchOpenInterestHistory,
  fetchTicker24h,
  mapKline,
  parseOiArray,
  parseRatioArray,
  parseTakerArray,
} from '../rest'
import { __resetModeForTests } from '../endpoints'

const rawKline = [
  1786797540000,
  '62985.00000000',
  '62985.01000000',
  '62977.81000000',
  '62977.82000000',
  '1.51777000',
  1786797599999,
  '95592.26906950',
  492,
  '0.08999000',
  '5668.01084010',
  '0',
]

beforeEach(() => {
  __resetModeForTests()
  // 默认代理可用：ping 返回 JSON → proxy 模式
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  __resetModeForTests()
})

describe('mapKline', () => {
  it('字段映射正确，openTime 毫秒转秒', () => {
    const c = mapKline(rawKline as never)
    expect(c.time).toBe(1786797540)
    expect(c.open).toBe(62985)
    expect(c.high).toBe(62985.01)
    expect(c.low).toBe(62977.81)
    expect(c.close).toBe(62977.82)
    expect(c.volume).toBe(1.51777)
    expect(c.isClosed).toBe(true)
  })
})

describe('fetchKlines', () => {
  it('请求相对路径 /api/v3/klines 且参数正确', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => [rawKline],
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = await fetchKlines('BTCUSDT', '5m', 500, 1234567, 7654321)
    const urls = fetchMock.mock.calls.map((c) => c[0] as string)
    const url = urls.find((u) => u.includes('/api/v3/klines'))
    expect(url).toBeDefined()
    expect(url!.startsWith('/api/v3/klines?')).toBe(true)
    expect(url).toContain('symbol=BTCUSDT')
    expect(url).toContain('interval=5m')
    expect(url).toContain('limit=500')
    expect(url).toContain('startTime=1234567')
    expect(url).toContain('endTime=7654321')
    expect(out).toHaveLength(1)
    expect(out[0].close).toBe(62977.82)
  })

  it('HTTP 错误重试 3 次后抛异常', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchKlines('BTCUSDT', '1m')).rejects.toThrow('http 429')
    // 1 次 ping 探测 + 3 次重试
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('首次 5xx 自动重试后成功', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' }, json: async () => [{}] }) // ping
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' }, json: async () => [rawKline] })
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchKlines('BTCUSDT', '1m')
    // 1 次 ping + 首次失败 + 重试成功
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(out).toHaveLength(1)
  })
})

describe('fetchTicker24h', () => {
  it('解析最新价与涨跌幅', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ lastPrice: '63000.5', priceChangePercent: '-1.234' }),
      }),
    )
    const t = await fetchTicker24h('BTCUSDT')
    expect(t.price).toBe(63000.5)
    expect(t.changePct).toBe(-1.234)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls.find((u) => u.includes('/api/v3/ticker/24hr?symbol=BTCUSDT'))).toBeDefined()
  })
})

describe('衍生品情绪解析纯函数', () => {
  it('parseRatioArray：long/short 占比与比值', () => {
    const out = parseRatioArray([
      { symbol: 'BTCUSDT', longAccount: '0.6724', longShortRatio: '2.0525', shortAccount: '0.3276', timestamp: 1786860000000 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toEqual({ timestamp: 1786860000000, long: 0.6724, short: 0.3276, longShortRatio: 2.0525 })
  })

  it('parseTakerArray：买卖量与比值', () => {
    const out = parseTakerArray([
      { buySellRatio: '0.9346', sellVol: '354.7610', buyVol: '331.5500', timestamp: 1786860000000 },
    ])
    expect(out[0]).toEqual({ timestamp: 1786860000000, buyVol: 331.55, sellVol: 354.761, buySellRatio: 0.9346 })
  })

  it('parseOiArray：币数量与美元价值', () => {
    const out = parseOiArray([
      { symbol: 'BTCUSDT', sumOpenInterest: '111331.03100000', sumOpenInterestValue: '7016972221.86800000', timestamp: 1786866300000 },
    ])
    expect(out[0]).toEqual({ timestamp: 1786866300000, oi: 111331.031, oiValue: 7016972221.868 })
  })

  it('fetchGlobalLongShortRatio：请求路径含 futures/data 与参数，解析结果', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { symbol: 'BTCUSDT', longAccount: '0.6724', longShortRatio: '2.0525', shortAccount: '0.3276', timestamp: 1786860000000 },
        ],
      }),
    )
    const out = await fetchGlobalLongShortRatio('BTCUSDT', 24)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    const url = urls.find((u) => u.includes('/futures/data/globalLongShortAccountRatio'))
    expect(url).toBeDefined()
    expect(url).toContain('symbol=BTCUSDT')
    expect(url).toContain('period=1h')
    expect(out[0].long).toBe(0.6724)
  })

  it('fetchOpenInterestHistory：请求路径正确', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { symbol: 'BTCUSDT', sumOpenInterest: '111331.031', sumOpenInterestValue: '7016972221.868', timestamp: 1786866300000 },
        ],
      }),
    )
    const out = await fetchOpenInterestHistory('BTCUSDT', 24)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls.find((u) => u.includes('/futures/data/openInterestHist'))).toBeDefined()
    expect(out[0].oi).toBe(111331.031)
  })
})


describe('COIN-M dapi 兜底（fapi 被网络阻断时回退）', () => {
  it('fetchFundingRate：fapi 失败 → 回退 dapi premiumIndex（COIN-M 交易对）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/html' } }) // ping → direct
      .mockRejectedValueOnce(new Error('fapi blocked')) // fapi premiumIndex 失败
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'BTCUSD_PERP',
          markPrice: '62750.3',
          lastFundingRate: '0.00002629',
          nextFundingTime: 1786924800000,
        }),
      }) // dapi 兜底成功
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchFundingRate('BTCUSDT')
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls[1]).toBe('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT')
    expect(urls[2]).toBe('https://dapi.binance.com/dapi/v1/premiumIndex?symbol=BTCUSD_PERP')
    expect(out.lastFundingRate).toBe(0.00002629)
    expect(out.nextFundingTime).toBe(1786924800000)
  })

  it('fetchOpenInterest：fapi 失败 → 回退 dapi openInterest', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/html' } })
      .mockRejectedValueOnce(new Error('fapi blocked'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ symbol: 'BTCUSD_PERP', openInterest: '11345545' }) })
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchOpenInterest('BTCUSDT')
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls[2]).toBe('https://dapi.binance.com/dapi/v1/openInterest?symbol=BTCUSD_PERP')
    expect(out).toBe(11345545)
  })

  it('fetchGlobalLongShortRatio：fapi 失败 → 回退 dapi futures/data（pair=BTCUSD）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/html' } })
      .mockRejectedValueOnce(new Error('fapi blocked'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { pair: 'BTCUSD', longAccount: '0.2051', longShortRatio: '0.2588', shortAccount: '0.7925', timestamp: 1786917600000 },
        ],
      })
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchGlobalLongShortRatio('BTCUSDT', 24)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls[2]).toContain('https://dapi.binance.com/futures/data/globalLongShortAccountRatio')
    expect(urls[2]).toContain('pair=BTCUSD')
    expect(urls[2]).toContain('period=1h')
    expect(out[0].long).toBe(0.2051)
  })

  it('fetchOpenInterestHistory：fapi 失败 → 回退 dapi futures/data（pair=BTCUSD）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/html' } })
      .mockRejectedValueOnce(new Error('fapi blocked'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { pair: 'BTCUSD', sumOpenInterest: '14118541', sumOpenInterestValue: '22468.21', timestamp: 1786917600000 },
        ],
      })
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchOpenInterestHistory('BTCUSDT', 24)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls[2]).toContain('https://dapi.binance.com/futures/data/openInterestHist')
    expect(urls[2]).toContain('pair=BTCUSD')
    expect(out[0].oi).toBe(14118541)
  })

  it('fapi 与 dapi 都失败 → 抛错（不静默吞掉）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/html' } })
      .mockRejectedValueOnce(new Error('fapi blocked'))
      .mockRejectedValueOnce(new Error('dapi blocked'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchFundingRate('BTCUSDT')).rejects.toThrow('dapi blocked')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('proxy 模式：不使用 dapi 兜底（单候选相对路径）', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' } }) // ping → proxy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ symbol: 'BTCUSDT', markPrice: '1', lastFundingRate: '0.0001', nextFundingTime: 1 }),
      })
    vi.stubGlobal('fetch', fetchMock)
    await fetchFundingRate('BTCUSDT')
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls[1]).toBe('/fapi/v1/premiumIndex?symbol=BTCUSDT')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
