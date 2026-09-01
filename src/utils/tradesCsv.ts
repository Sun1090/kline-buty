import type { TradeRecord } from '../hooks/usePaperAccount'
import { toCsv, fmtCsv } from './csv'

/**
 * 交易流水导出 CSV（D14）：纯函数生成 CSV 文本，UI 层负责触发下载。
 * 复用 csv.ts 的 toCsv（CRLF + 自动转义），列：时间/品种/方向/类型/价格/数量/手续费/盈亏。
 */

/** 时间戳 → 本地可读时间（YYYY-MM-DD HH:MM:SS，带秒便于区分同秒成交） */
export function fmtTradeTime(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 流水数组 → CSV 文本（含表头） */
export function tradesToCsv(trades: TradeRecord[]): string {
  const rows: (string | number | null | undefined)[][] = [
    ['time', 'symbol', 'side', 'kind', 'price', 'qty', 'fee', 'pnl'],
  ]
  for (const tr of trades) {
    rows.push([
      fmtTradeTime(tr.at),
      tr.symbol,
      tr.side,
      tr.kind,
      fmtCsv(tr.price, 8),
      fmtCsv(tr.qty, 8),
      fmtCsv(tr.fee, 8),
      tr.pnl === undefined ? null : fmtCsv(tr.pnl, 8),
    ])
  }
  return toCsv(rows)
}

/** 导出文件名：trades-YYYY-MM-DD.csv */
export function tradesCsvFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `trades-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}
