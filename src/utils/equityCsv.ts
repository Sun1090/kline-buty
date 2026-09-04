import type { TradeRecord } from '../hooks/usePaperAccount'
import { equitySeries } from './equity'

/** J6 权益曲线导出文件名（含日期，避免同名覆盖） */
export function equityCsvFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `kline-buty-equity-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`
}

/**
 * J6 权益曲线 CSV：按时间升序导出每笔成交后的权益。
 * 表头 `time,equity`；time 为 ISO 毫秒时间戳，equity 保留 6 位小数。
 */
export function equityToCsv(trades: TradeRecord[], initialBalance = 10_000): string {
  const pts = equitySeries(trades, initialBalance)
  const rows = pts.map((p) => `${new Date(p.at).toISOString()},${p.equity.toFixed(6)}`)
  return ['time,equity', ...rows].join('\n')
}
