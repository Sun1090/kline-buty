export interface PriceAlert {
  id: string
  symbol: string
  direction: 'above' | 'below'
  price: number
  /** 一次性触发标记（触发后不再重复） */
  triggered: boolean
  /** D10 循环模式：触发后价格回撤到阈值另一侧时自动重新武装，可重复触发 */
  repeat?: boolean
  /** D9 时间窗口（本地时区，分钟自 00:00）：可选，设置后仅在窗口内触发 */
  time?: { start: number; end: number }
}

/** 条件是否满足（价格方向） */
export function evaluateAlert(a: PriceAlert, currentPrice: number): boolean {
  if (a.direction === 'above') return currentPrice >= a.price
  return currentPrice <= a.price
}

/** D9 时间窗口判定：分钟自 0:00 起算，闭区间 [start, end)；无窗口恒满足 */
export function evaluateTime(a: PriceAlert, minuteOfDay: number): boolean {
  if (!a.time) return true
  // 跨午夜窗口（start > end）视为 wrap：minute >= start || minute < end
  if (a.time.start <= a.time.end) return minuteOfDay >= a.time.start && minuteOfDay < a.time.end
  return minuteOfDay >= a.time.start || minuteOfDay < a.time.end
}

/** 复合条件：价格方向 AND 时间窗口（minuteOfDay 由调用方按当前时间计算） */
export function evaluateAlertCombo(a: PriceAlert, currentPrice: number, minuteOfDay: number): boolean {
  return evaluateAlert(a, currentPrice) && evaluateTime(a, minuteOfDay)
}

/** 应触发（条件满足且未触发过）。可选 minuteOfDay 参与时间窗口复合判定 */
export function shouldTrigger(a: PriceAlert, currentPrice: number, minuteOfDay?: number): boolean {
  const cond = minuteOfDay === undefined ? evaluateAlert(a, currentPrice) : evaluateAlertCombo(a, currentPrice, minuteOfDay)
  return !a.triggered && cond
}

/**
 * D10 提醒状态推进（纯函数）：
 * - 未触发且条件满足 → 触发（triggered=true）；
 * - 循环模式（repeat）已触发且条件不再满足 → 重新武装（triggered=false）；
 * - 其余保持原样。可选 minuteOfDay 参与时间窗口复合判定。
 */
export function stepAlert(a: PriceAlert, currentPrice: number, minuteOfDay?: number): PriceAlert {
  if (shouldTrigger(a, currentPrice, minuteOfDay)) return { ...a, triggered: true }
  const cond = minuteOfDay === undefined ? evaluateAlert(a, currentPrice) : evaluateAlertCombo(a, currentPrice, minuteOfDay)
  if (a.repeat && a.triggered && !cond) return { ...a, triggered: false }
  return a
}

export function createAlert(symbol: string, direction: 'above' | 'below', price: number, repeat = false, time?: { start: number; end: number }): PriceAlert {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    direction,
    price,
    triggered: false,
    repeat,
    time,
  }
}

/** 已触发的提醒是否仍满足（用于显示"已触发"状态） */
export function isCurrentlyTrue(a: PriceAlert, currentPrice: number): boolean {
  return evaluateAlert(a, currentPrice)
}
