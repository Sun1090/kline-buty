import type { DrawingTool } from './logic'

/**
 * I5 画线语义识别：根据已画图形建议指标（矩形/通道 → 波动区间，趋势线 → 趋势确认，
 * 水平支撑/阻力 → 超买超卖，十字/竖直 → 时间结构）。
 * 纯函数：输入画线工具集合，输出建议或 null。
 */
export interface DrawingSuggestion {
  main?: 'ma' | 'ema' | 'boll'
  sub?: 'volume' | 'macd' | 'rsi' | 'kdj' | 'atr'
  /** i18n 键：indicator.rec*（说明建议依据） */
  rationale: string
}

export function suggestFromDrawings(types: DrawingTool[]): DrawingSuggestion | null {
  const has = (t: DrawingTool) => types.includes(t)
  // 区间 / 通道 / 斐波那契 → 波动边界：布林带（宽度）+ RSI（超买超卖）
  if (has('rect') || has('channel') || has('fib')) return { main: 'boll', sub: 'rsi', rationale: 'semanticsRange' }
  // 趋势线 / 延长线 / 角度线 → 趋势确认：EMA（跟随）+ MACD
  if (has('trend') || has('extended') || has('angle')) return { main: 'ema', sub: 'macd', rationale: 'semanticsTrend' }
  // 水平支撑/阻力 → 区间高抛低吸：RSI
  if (has('horizontal') || has('pricelabel')) return { sub: 'rsi', rationale: 'semanticsLevels' }
  // 十字 / 竖直 → 时间结构/背离：KDJ
  if (has('vertical') || has('cross')) return { sub: 'kdj', rationale: 'semanticsTime' }
  return null
}
