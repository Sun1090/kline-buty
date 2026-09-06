export interface Position {
  entry: number
  quantity: number
  direction: 'long' | 'short'
  takeProfit?: number
  stopLoss?: number
  /** D9 开仓杠杆（可选）：用于动态保证金率与强平预警（未存杠杆的旧仓按 1x 全额口径） */
  leverage?: number
}

export interface PnlResult {
  pnl: number
  pnlPct: number
}

/** 浮动盈亏：多头 (price-entry)×qty，空头 (entry-price)×qty */
export function calcPnl(p: Position, price: number): PnlResult {
  const dir = p.direction === 'long' ? 1 : -1
  const pnl = (price - p.entry) * p.quantity * dir
  const pnlPct = p.entry === 0 ? 0 : ((price - p.entry) / p.entry) * 100 * dir
  return { pnl, pnlPct }
}

/** 依据入场价与方向给出止盈/止损参考价 */
export function suggestLevels(
  entry: number,
  direction: 'long' | 'short',
  tpPct: number,
  slPct: number,
): { takeProfit: number; stopLoss: number } {
  const dir = direction === 'long' ? 1 : -1
  return {
    takeProfit: entry * (1 + (dir * tpPct) / 100),
    stopLoss: entry * (1 - (dir * slPct) / 100),
  }
}

/** 价格是否已触达止盈/止损 */
export function checkHit(p: Position, price: number): 'takeProfit' | 'stopLoss' | null {
  if (p.direction === 'long') {
    if (p.takeProfit !== undefined && price >= p.takeProfit) return 'takeProfit'
    if (p.stopLoss !== undefined && price <= p.stopLoss) return 'stopLoss'
  } else {
    if (p.takeProfit !== undefined && price <= p.takeProfit) return 'takeProfit'
    if (p.stopLoss !== undefined && price >= p.stopLoss) return 'stopLoss'
  }
  return null
}

/**
 * 强平价（简化逐仓模型）：当浮动亏损达到全部保证金时触发强平。
 *
 * 保证金 = 名义金额 / 杠杆 = entry×qty/leverage。
 * 亏损 = |price − entry| × qty，令其等于保证金：
 *   |liq − entry| = entry / leverage
 * 多头 → liq = entry × (1 − 1/leverage)；空头 → liq = entry × (1 + 1/leverage)。
 *
 * 是"损失 = 全部初始保证金即强平"的保守近似（未计维持保证金率/手续费；
 * 真实撮合平台维持保证金率会让强平价略收窄，此处用于模拟盘教育展示）。
 * 返回 null 表示杠杆无效（≤1 无杠杆则多头亏损上限 = 全部余额，但概念上高杠杆才有强平）。
 */
export function calcLiquidationPrice(p: Position, leverage: number): number | null {
  if (!Number.isFinite(leverage) || leverage <= 1) return null
  // 多头亏损于价格下跌 → 强平价在下方 entry×(1−1/lev)；空头反之在上方
  const dir = p.direction === 'long' ? -1 : 1
  return p.entry * (1 + dir / leverage)
}

/** 开仓所需保证金（名义金额 / 杠杆） */
export function calcMargin(notional: number, leverage: number): number {
  if (!Number.isFinite(leverage) || leverage <= 0) return notional
  return notional / leverage
}

/**
 * D2 动态保证金率（随盈亏变化）：模拟盘为全额保证金模型（初始保证金 = 名义金额/杠杆），
 * 当前保证金率 = (初始保证金 + 未实现盈亏) / 初始保证金。
 * 无杠杆（null）→ 按 1x 全保证金口径。返回百分比数值（如 1.12 = 112%）。
 */
export function marginRate(p: Position, price: number, leverage?: number): number {
  const initial = calcMargin(p.entry * p.quantity, leverage ?? 1)
  if (initial <= 0) return 0
  const unrealized = calcPnl(p, price).pnl
  return (initial + unrealized) / initial
}

/** D9 强平预警档位：基于动态保证金率（1=满额，0=全部保证金耗尽即强平）。 */
export type LiquidationRisk = 'safe' | 'warn' | 'critical'

/**
 * D9 强平预警分级：保证金率剩余 <50% → critical（接近强平）、<80% → warn、其余 safe。
 * 纯函数，阈值便于单测。
 */
export function liquidationRisk(rate: number): LiquidationRisk {
  if (rate < 0.5) return 'critical'
  if (rate < 0.8) return 'warn'
  return 'safe'
}
