import type { Candle } from '../chart/types'

export interface VolumeProfileBucket {
  /** 桶中心价格 */
  price: number
  /** 桶内总成交量 */
  volume: number
  /** 上涨 K 线分配量（买盘） */
  upVolume: number
  /** 下跌 K 线分配量（卖盘） */
  downVolume: number
}

/**
 * 成交量分布（VPVR）：把每根 K 线的成交量按价格均匀分配到 high-low
 * 覆盖的桶，涨 K 记买量、跌 K 记卖量。可用于识别筹码密集区。
 */
export function computeVolumeProfile(candles: Candle[], buckets = 24): VolumeProfileBucket[] {
  if (candles.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const c of candles) {
    if (c.low < min) min = c.low
    if (c.high > max) max = c.high
  }
  const range = max - min
  if (!Number.isFinite(range) || range <= 0) return []
  const step = range / buckets

  const out: VolumeProfileBucket[] = Array.from({ length: buckets }, (_, i) => ({
    price: min + step * (i + 0.5),
    volume: 0,
    upVolume: 0,
    downVolume: 0,
  }))

  for (const c of candles) {
    const loIdx = Math.min(buckets - 1, Math.max(0, Math.floor((c.low - min) / step)))
    const hiIdx = Math.min(buckets - 1, Math.max(0, Math.floor((c.high - min) / step)))
    const span = hiIdx - loIdx + 1
    const per = c.volume / span
    const isUp = c.close >= c.open
    for (let i = loIdx; i <= hiIdx; i++) {
      out[i].volume += per
      if (isUp) out[i].upVolume += per
      else out[i].downVolume += per
    }
  }
  return out
}

/** 筹码密集区：量最大的桶 */
export function pointOfControl(profile: VolumeProfileBucket[]): VolumeProfileBucket | null {
  if (profile.length === 0) return null
  return profile.reduce((best, b) => (b.volume > best.volume ? b : best), profile[0])
}
