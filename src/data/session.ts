import type { Candle } from '../chart/types'

/**
 * v0.5 会话高低点（Session High/Low）：按最新 K 线所在 UTC 日聚合当日最高/最低价。
 * 加密货币 24/7 交易以 UTC 日为会话边界（Binance 口径）。纯函数便于单测。
 */

export interface SessionExtremes {
  /** 会话（UTC 日）起始时间戳（秒） */
  dayStart: number
  /** 会话内最高价（含未收盘 K 线实时 high） */
  high: number
  /** 会话内最低价（含未收盘 K 线实时 low） */
  low: number
}

/** 计算最新 K 线所在 UTC 日的会话高低点；空数据 → null。 */
export function sessionExtremes(candles: Candle[]): SessionExtremes | null {
  if (candles.length === 0) return null
  const last = candles[candles.length - 1]
  const dayStart = Math.floor(last.time / 86_400) * 86_400
  let high = -Infinity
  let low = Infinity
  for (const c of candles) {
    if (c.time < dayStart || c.time >= dayStart + 86_400) continue
    if (c.high > high) high = c.high
    if (c.low < low) low = c.low
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null
  return { dayStart, high, low }
}
