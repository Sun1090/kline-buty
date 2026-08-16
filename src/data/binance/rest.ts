import type { Candle, Period } from '../../chart/types'
import type { RawKline } from './types'
import { buildApiUrl, detectMode } from './endpoints'

/** 币安 K 线 → 领域类型（openTime 毫秒 → 秒） */
export function mapKline(raw: RawKline): Candle {
  return {
    time: Math.floor(raw[0] / 1000),
    open: Number(raw[1]),
    high: Number(raw[2]),
    low: Number(raw[3]),
    close: Number(raw[4]),
    volume: Number(raw[5]),
    isClosed: true,
  }
}

export interface Ticker24h {
  price: number
  changePct: number
  high: number
  low: number
  quoteVolume: number
}

/** 请求封装：自动探测代理/直连模式 */
async function binanceGet(path: string): Promise<Response> {
  const mode = await detectMode()
  const res = await fetch(buildApiUrl(mode, path))
  if (!res.ok) throw new Error(`binance http ${res.status}`)
  return res
}

/**
 * 拉取历史 K 线。优先走代理（相对路径 /api），静态托管下自动直连币安公开 API。
 * 5xx/网络错误自动重试 2 次。
 */
export async function fetchKlines(
  symbol: string,
  interval: Period,
  limit = 800,
  startTime?: number,
  endTime?: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, interval, limit: String(limit) })
  if (startTime !== undefined) params.set('startTime', String(startTime))
  if (endTime !== undefined) params.set('endTime', String(endTime))

  const url = `/api/v3/klines?${params.toString()}`
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt))
    try {
      const res = await binanceGet(url)
      const data = (await res.json()) as RawKline[]
      return data.map(mapKline)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('binance klines failed')
}

/** 24 小时行情摘要（最新价/涨跌幅/高低/成交额） */
export async function fetchTicker24h(symbol: string): Promise<Ticker24h> {
  const res = await binanceGet(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)
  const d = (await res.json()) as {
    lastPrice: string
    priceChangePercent: string
    highPrice: string
    lowPrice: string
    quoteVolume: string
  }
  return {
    price: Number(d.lastPrice),
    changePct: Number(d.priceChangePercent),
    high: Number(d.highPrice),
    low: Number(d.lowPrice),
    quoteVolume: Number(d.quoteVolume),
  }
}

export interface FundingRate {
  markPrice: number
  lastFundingRate: number
  nextFundingTime: number
}

/** 永续合约资金费率 */
export async function fetchFundingRate(symbol: string): Promise<FundingRate> {
  const res = await binanceGet(`/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`)
  const d = (await res.json()) as {
    markPrice: string
    lastFundingRate: string
    nextFundingTime: number
  }
  return {
    markPrice: Number(d.markPrice),
    lastFundingRate: Number(d.lastFundingRate),
    nextFundingTime: d.nextFundingTime,
  }
}

/** 永续合约未平仓量 */
export async function fetchOpenInterest(symbol: string): Promise<number> {
  const res = await binanceGet(`/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`)
  const d = (await res.json()) as { openInterest: string }
  return Number(d.openInterest)
}
