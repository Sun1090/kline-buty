import type { Candle } from '../chart/types'
import { atrPercent } from '../chart/volatility'

/** I10 指标智能推荐：按趋势强度与波动率给出主/副图指标建议 */
export type RecommendationRationale = 'trending' | 'ranging' | 'volatile'

export interface IndicatorRecommendation {
  main: 'ma' | 'ema' | 'boll'
  sub: 'volume' | 'macd' | 'rsi' | 'atr'
  rationale: RecommendationRationale
}

/**
 * 趋势强度 = 最近 N 根净位移 / 起点价（|Δ|/first）；波动率 = 最近 14 根 ATR%。
 * - 高波动（ATR% > 3）→ 布林带（宽度反映波动）+ ATR；
 * - 明显趋势（净位移 > 2%）→ EMA（跟随快）+ MACD（趋势确认）；
 * - 震荡 → MA + RSI（超买超卖）。
 * 数据不足 → 保守 MA + Volume。纯函数便于单测。
 */
export function recommendIndicators(candles: Pick<Candle, 'high' | 'low' | 'close'>[], lookback = 20): IndicatorRecommendation {
  if (candles.length < lookback) return { main: 'ma', sub: 'volume', rationale: 'ranging' }
  const closes = candles.slice(-lookback)
  const first = closes[0].close
  const last = closes[closes.length - 1].close
  if (first <= 0) return { main: 'ma', sub: 'volume', rationale: 'ranging' }
  const trend = Math.abs(last - first) / first
  const atr = atrPercent(candles, 14)
  if (atr > 3) return { main: 'boll', sub: 'atr', rationale: 'volatile' }
  if (trend > 0.02) return { main: 'ema', sub: 'macd', rationale: 'trending' }
  return { main: 'ma', sub: 'rsi', rationale: 'ranging' }
}
