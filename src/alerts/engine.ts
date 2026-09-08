export interface PriceAlert {
  id: string
  symbol: string
  direction: 'above' | 'below'
  price: number
  /** 一次性触发标记（触发后不再重复） */
  triggered: boolean
  /** D10 循环模式：触发后价格回撤到阈值另一侧时自动重新武装，可重复触发 */
  repeat?: boolean
  /** K10 重复间隔（分钟）：触发后距上次触发不足该间隔不重复触发（武装保护） */
  repeatInterval?: number
  /** K10 最近一次触发时间戳（ms）；用于间隔判定 */
  lastTriggeredAt?: number
  /** K2 提醒分组名（可选；未分组 undefined） */
  group?: string
  /** D9 时间窗口（本地时区，分钟自 00:00）：可选，设置后仅在窗口内触发 */
  time?: { start: number; end: number }
  /** E6 到期时间戳（ms）：到达后提醒失效（不再触发，UI 显示已过期） */
  expiresAt?: number
  /** E3/E7 停用标记：组级一键开关与批量停用共用；停用后不触发 */
  disabled?: boolean
  /** E15 备注字段（可选，展示在提醒行） */
  note?: string
  /** E10 价格精度（小数位）：UI 显示提醒目标价的小数位数；缺省按价段自适应 */
  pricePrecision?: number
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

/** E6 是否已到期（当前时间 ≥ expiresAt；无到期时间恒 false） */
export function isExpired(a: PriceAlert, now = Date.now()): boolean {
  return a.expiresAt !== undefined && a.expiresAt <= now
}

/** 应触发（条件满足且未触发过）。可选 minuteOfDay 参与时间窗口复合判定。E3/E6：停用或过期提醒不触发 */
export function shouldTrigger(a: PriceAlert, currentPrice: number, minuteOfDay?: number, now = Date.now()): boolean {
  if (a.disabled || isExpired(a, now)) return false
  const cond = minuteOfDay === undefined ? evaluateAlert(a, currentPrice) : evaluateAlertCombo(a, currentPrice, minuteOfDay)
  return !a.triggered && cond
}

/**
 * D10/K10 提醒状态推进（纯函数）：
 * - 未触发且条件满足 → 触发（triggered=true，记录 lastTriggeredAt）；
 * - K10 重复间隔：已触发后距上次触发不足 repeatInterval 分钟 → 不触发；
 * - 循环模式（repeat）已触发且条件不再满足 → 重新武装（triggered=false）；
 * - 其余保持原样。可选 minuteOfDay 参与时间窗口复合判定。
 */
export function stepAlert(a: PriceAlert, currentPrice: number, minuteOfDay?: number, now = Date.now()): PriceAlert {
  // E3/E6：停用或过期不触发也不重新武装
  if (a.disabled || isExpired(a, now)) return a
  if (shouldTrigger(a, currentPrice, minuteOfDay, now)) {
    // K10 间隔保护：repeatInterval 分钟内的重复条件（含首次触发后）不二次触发
    if (a.lastTriggeredAt !== undefined && a.repeatInterval && now - a.lastTriggeredAt < a.repeatInterval * 60_000) {
      return a
    }
    return { ...a, triggered: true, lastTriggeredAt: now }
  }
  const cond = minuteOfDay === undefined ? evaluateAlert(a, currentPrice) : evaluateAlertCombo(a, currentPrice, minuteOfDay)
  if (a.repeat && a.triggered && !cond) return { ...a, triggered: false }
  return a
}

export interface AlertCreateOptions {
  repeat?: boolean
  time?: { start: number; end: number }
  repeatInterval?: number
  group?: string
  /** E6 到期时间戳（ms） */
  expiresAt?: number
  /** E15 备注 */
  note?: string
  /** E10 价格精度（小数位） */
  pricePrecision?: number
  /** E3/E7 初始停用标记 */
  disabled?: boolean
}

export function createAlert(symbol: string, direction: 'above' | 'below', price: number, repeat = false, time?: { start: number; end: number }, repeatInterval?: number, group?: string, opts?: AlertCreateOptions): PriceAlert {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    direction,
    price,
    triggered: false,
    repeat,
    repeatInterval,
    group,
    time,
    disabled: opts?.disabled,
    note: opts?.note,
    expiresAt: opts?.expiresAt,
    pricePrecision: opts?.pricePrecision,
  }
}

/** E7 批量停用/启用：按 id 集合统一改写 disabled。纯函数，返回新数组 */
export function setAlertsDisabled(alerts: PriceAlert[], ids: Set<string>, disabled: boolean): PriceAlert[] {
  return alerts.map((a) => (ids.has(a.id) && a.disabled !== disabled ? { ...a, disabled } : a))
}

/** E3 组级一键开关：组内全部提醒停用/启用（未分组不受影响）。返回新数组 */
export function setGroupDisabled(alerts: PriceAlert[], group: string, disabled: boolean): PriceAlert[] {
  return alerts.map((a) => (a.group === group && a.disabled !== disabled ? { ...a, disabled } : a))
}

/** 已触发的提醒是否仍满足（用于显示"已触发"状态） */
export function isCurrentlyTrue(a: PriceAlert, currentPrice: number): boolean {
  return evaluateAlert(a, currentPrice)
}

/**
 * I6 波动率自适应阈值：以当前价 × ATR% × 倍数 计算上下阈值。
 * above → price + 波动带；below → price − 波动带。纯函数便于单测。
 */
export function adaptiveThreshold(
  price: number,
  direction: 'above' | 'below',
  atrPct: number,
  mult = 1,
): number {
  const delta = price * Math.max(0, atrPct / 100) * Math.max(0.1, mult)
  return direction === 'above' ? price + delta : price - delta
}
