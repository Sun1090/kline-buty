import type { TradeRecord } from '../hooks/usePaperAccount'

export interface EquityPoint {
  /** 成交时间戳（ms） */
  at: number
  /** 该笔成交后的账户权益（USDT） */
  equity: number
}

/**
 * D13 权益曲线：由成交流水（新记录在前）反向推导权益时间序列。
 *
 * 记账口径与 usePaperAccount 自洽：
 * - 开仓：扣开仓手续费 → equity −= fee
 * - 平仓：加净盈亏（已含平仓手续费，即记录里的 pnl 字段）→ equity += pnl
 *
 * 返回按时间升序的权益点（起始点为初始资金，不含成交则仅返回首点）。
 */
export function equitySeries(trades: TradeRecord[], initialBalance = 10_000): EquityPoint[] {
  // 新记录在前 → 反转为时间升序
  const asc = [...trades].reverse()
  const points: EquityPoint[] = []
  let equity = initialBalance
  for (const t of asc) {
    if (t.kind === 'open') {
      equity -= t.fee
    } else {
      equity += t.pnl ?? 0
    }
    points.push({ at: t.at, equity })
  }
  return points
}
