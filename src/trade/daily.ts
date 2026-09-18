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
  return realizedPnlIn(trades, dayKeyFor, dayKeyFor(now))
}

const DAY_MS = 86_400_000
/** 1970-01-05（周一）00:00 UTC 为第 0 周起点：`(t - 4d) / 7d` 桶对齐周一 */
const MONDAY_EPOCH_MS = 4 * DAY_MS

/** UTC 周键 `W<n>`：从 1970-01-05（周一）起算的 7 天桶序号（与「周一为本周起点」一致）。 */
export function weekKeyFor(at: number): string {
  return `W${Math.floor((at - MONDAY_EPOCH_MS) / (7 * DAY_MS))}`
}

/** UTC 月键 `YYYY-MM`（与 dayKeyFor 同口径）。 */
export function monthKeyFor(at: number): string {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`
}

/** 按条件汇总已实现盈亏（仅 close 且带 pnl 的记录）；无匹配 → 0。 */
export function realizedPnlWhere(trades: TradeRecord[], pred: (t: TradeRecord) => boolean): number {
  let pnl = 0
  for (const t of trades) {
    if (t.kind === 'close' && t.pnl !== undefined && pred(t)) pnl += t.pnl
  }
  return pnl
}

/** 某 UTC 周期（日/周/月键口径）已实现盈亏；无平仓 → 0。 */
export function realizedPnlIn(trades: TradeRecord[], keyOf: (at: number) => string, key: string): number {
  return realizedPnlWhere(trades, (t) => keyOf(t.at) === key)
}

/** 今日 / 本周 / 本月已实现盈亏集合（UTC 口径；render 内调用避免直接 Date.now）。 */
export function periodPnl(
  trades: TradeRecord[],
  now = Date.now(),
): { today: number; week: number; month: number } {
  return {
    today: realizedPnlIn(trades, dayKeyFor, dayKeyFor(now)),
    week: realizedPnlIn(trades, weekKeyFor, weekKeyFor(now)),
    month: realizedPnlIn(trades, monthKeyFor, monthKeyFor(now)),
  }
}
