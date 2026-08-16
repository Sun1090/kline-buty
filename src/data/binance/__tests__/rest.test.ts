import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchKlines, fetchTicker24h, mapKline } from '../rest'
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
