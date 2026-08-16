import type { Candle, Period } from '../../chart/types'
import type { RawKline } from './types'
import { DAPI_BASE, buildApiUrl, detectMode, toCoinMPair, toCoinMSymbol } from './endpoints'

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

/**
 * 请求封装：自动探测代理/直连模式。
 * direct 模式支持候选 URL 兜底（fapi 被网络阻断时回退 COIN-M dapi），
 * 依次尝试直到首个成功；全部失败抛最后错误。
 */
async function binanceGet(path: string, fallback?: string): Promise<Response> {
  const mode = await detectMode()
  const candidates =
    mode === 'proxy' ? [path] : [buildApiUrl(mode, path), ...(fallback ? [fallback] : [])]
  let lastErr: unknown
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`binance http ${res.status}`)
      return res
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('binance request failed')
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
  const res = await binanceGet(
    `/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
    `${DAPI_BASE}/dapi/v1/premiumIndex?symbol=${encodeURIComponent(toCoinMSymbol(symbol))}`,
  )
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
  const res = await binanceGet(
    `/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`,
    `${DAPI_BASE}/dapi/v1/openInterest?symbol=${encodeURIComponent(toCoinMSymbol(symbol))}`,
  )
  const d = (await res.json()) as { openInterest: string }
  return Number(d.openInterest)
}


/* ============ 衍生品情绪数据（futures/data 公开端点） ============ */

export interface RatioPoint {
  /** 毫秒时间戳 */
  timestamp: number
  /** 多/空账户占比（0~1） */
  long: number
  short: number
  longShortRatio: number
}

/** 解析多空比数组（globalLongShortAccountRatio / topLongShortPositionRatio 同构） */
export function parseRatioArray(raw: unknown[]): RatioPoint[] {
  return raw.map((r) => {
    const d = r as { timestamp: number; longAccount: string; shortAccount: string; longShortRatio: string }
    return {
      timestamp: d.timestamp,
      long: Number(d.longAccount),
      short: Number(d.shortAccount),
      longShortRatio: Number(d.longShortRatio),
    }
  })
}

export interface TakerPoint {
  timestamp: number
  buyVol: number
  sellVol: number
  buySellRatio: number
}

/** 解析主动买卖量比数组（takerlongshortRatio） */
export function parseTakerArray(raw: unknown[]): TakerPoint[] {
  return raw.map((r) => {
    const d = r as { timestamp: number; buyVol: string; sellVol: string; buySellRatio: string }
    return {
      timestamp: d.timestamp,
      buyVol: Number(d.buyVol),
      sellVol: Number(d.sellVol),
      buySellRatio: Number(d.buySellRatio),
    }
  })
}

export interface OiPoint {
  timestamp: number
  oi: number
  oiValue: number
}

/** 解析未平仓历史数组（openInterestHist，sumOpenInterest 为币数量） */
export function parseOiArray(raw: unknown[]): OiPoint[] {
  return raw.map((r) => {
    const d = r as { timestamp: number; sumOpenInterest: string; sumOpenInterestValue: string }
    return {
      timestamp: d.timestamp,
      oi: Number(d.sumOpenInterest),
      oiValue: Number(d.sumOpenInterestValue),
    }
  })
}

/** 全账户多空持仓人数比（周期 1h，limit 条，倒序 → 升序） */
export async function fetchGlobalLongShortRatio(symbol: string, limit = 24): Promise<RatioPoint[]> {
  const res = await binanceGet(
    `/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(symbol)}&period=1h&limit=${limit}`,
    `${DAPI_BASE}/futures/data/globalLongShortAccountRatio?pair=${encodeURIComponent(toCoinMPair(symbol))}&period=1h&limit=${limit}`,
  )
  return parseRatioArray((await res.json()) as unknown[])
}

/** 大户持仓量多空比（topLongShortPositionRatio） */
export async function fetchTopTraderPositionRatio(symbol: string, limit = 24): Promise<RatioPoint[]> {
  const res = await binanceGet(
    `/futures/data/topLongShortPositionRatio?symbol=${encodeURIComponent(symbol)}&period=1h&limit=${limit}`,
    `${DAPI_BASE}/futures/data/topLongShortPositionRatio?pair=${encodeURIComponent(toCoinMPair(symbol))}&period=1h&limit=${limit}`,
  )
  return parseRatioArray((await res.json()) as unknown[])
}

/** 主动买卖量比（takerlongshortRatio） */
export async function fetchTakerBuySellRatio(symbol: string, limit = 24): Promise<TakerPoint[]> {
  const res = await binanceGet(
    `/futures/data/takerlongshortRatio?symbol=${encodeURIComponent(symbol)}&period=1h&limit=${limit}`,
  )
  return parseTakerArray((await res.json()) as unknown[])
}

/** 未平仓量历史（openInterestHist） */
export async function fetchOpenInterestHistory(symbol: string, limit = 24): Promise<OiPoint[]> {
  const res = await binanceGet(
    `/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol)}&period=1h&limit=${limit}`,
    `${DAPI_BASE}/futures/data/openInterestHist?pair=${encodeURIComponent(toCoinMPair(symbol))}&period=1h&limit=${limit}`,
  )
  return parseOiArray((await res.json()) as unknown[])
}
