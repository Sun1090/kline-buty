import type { TradeRecord } from '../hooks/usePaperAccount'

/**
 * v0.5 交易流水按日分组与每日小计（纯函数）。
 * 流水记录约定「新在前」；分组按 UTC 日，保持输入顺序（新日在前的组序）。
 */

export interface DailyGroup {
  /** UTC 日键 `YYYY-MM-DD`（用于展示与排序） */
  dayKey: string
  /** 该日流水（保持原顺序） */
  trades: TradeRecord[]
}

/** 时间戳 → UTC 日键 `YYYY-MM-DD`（与 K 线/会话口径一致） */
export function dayKeyFor(at: number): string {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/** 将流水按 UTC 日分组（新日在前的组序；同日内保持原顺序）。 */
export function groupTradesByDay(trades: TradeRecord[]): DailyGroup[] {
  const map = new Map<string, TradeRecord[]>()
  for (const t of trades) {
    const key = dayKeyFor(t.at)
    const arr = map.get(key)
    if (arr) arr.push(t)
    else map.set(key, [t])
  }
  return [...map.entries()].map(([dayKey, dayTrades]) => ({ dayKey, trades: dayTrades }))
}

export interface DailySummary {
  /** 当日流水笔数 */
  count: number
  /** 当日净已实现盈亏（USDT，平仓 pnl 合计） */
  pnl: number
  /** 当日已平仓笔数 */
  closed: number
}

/** 每日小计：笔数 / 已平仓数 / 净盈亏（pnl 为平仓记录合计；无平仓 → 0） */
export function dailySummary(day: DailyGroup): DailySummary {
  let pnl = 0
  let closed = 0
  for (const t of day.trades) {
    if (t.kind === 'close' && t.pnl !== undefined) {
      pnl += t.pnl
      closed++
    }
  }
  return { count: day.trades.length, pnl, closed }
}

/** 今日已实现盈亏（USDT）：UTC 今日平仓记录 pnl 合计；无平仓 → 0。 */
export function todayRealizedPnl(trades: TradeRecord[], now = Date.now()): number {
  const key = dayKeyFor(now)
  const today = groupTradesByDay(trades).find((g) => g.dayKey === key)
  return today ? dailySummary(today).pnl : 0
}
