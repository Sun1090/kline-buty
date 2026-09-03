import type { Candle } from './types'

/** G5 量能异动：最新一根成交量 / 前 n 根均量。返回倍数（>1 放大，<1 萎缩）；数据不足返回 null。 */
export function volumeSurgeRatio(candles: Candle[], lookback = 20): number | null {
  if (candles.length < lookback + 1) return null
  let sum = 0
  for (let i = candles.length - 1 - lookback; i < candles.length - 1; i++) {
    sum += candles[i].volume
  }
  const avg = sum / lookback
  if (avg <= 0) return null
  return candles[candles.length - 1].volume / avg
}

/** 是否判定为「量能放大」异动（超过均量倍数阈值，默认 3×） */
export function isVolumeSurge(ratio: number | null, threshold = 3): boolean {
  return ratio !== null && ratio >= threshold
}
