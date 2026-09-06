import type { TradeRecord } from '../hooks/usePaperAccount'

/** D6 交易盈亏统计：从成交流水（平仓记录）汇总胜率/盈亏比/累计盈亏 */
export interface TradeStats {
  /** 平仓笔数 */
  closed: number
  /** 盈利笔数（pnl > 0） */
  wins: number
  /** 亏损笔数（pnl < 0；零盈亏不计入胜/负） */
  losses: number
  /** 胜率 = wins / closed（无平仓 → 0） */
  winRate: number
  /** 累计已实现盈亏（USDT） */
  totalPnl: number
  /** 盈亏比 = 平均盈利 / 平均亏损（无一侧 → Infinity/0 由调用方文案化） */
  avgWin: number
  avgLoss: number
  profitFactor: number
}

/** 汇总平仓流水；空/无平仓 → 全零统计。纯函数，便于单测。 */
export function tradeStats(trades: TradeRecord[]): TradeStats {
  const closes = trades.filter((t) => t.kind === 'close' && t.pnl !== undefined)
  let wins = 0
  let losses = 0
  let winSum = 0
  let lossSum = 0
  for (const t of closes) {
    const pnl = t.pnl as number
    if (pnl > 0) {
      wins++
      winSum += pnl
    } else if (pnl < 0) {
      losses++
      lossSum += -pnl
    }
  }
  const closed = closes.length
  return {
    closed,
    wins,
    losses,
    winRate: closed === 0 ? 0 : wins / closed,
    totalPnl: closes.reduce((acc, t) => acc + (t.pnl as number), 0),
    avgWin: wins === 0 ? 0 : winSum / wins,
    avgLoss: losses === 0 ? 0 : lossSum / losses,
    profitFactor: lossSum === 0 ? (wins > 0 ? winSum : 0) : winSum / lossSum,
  }
}