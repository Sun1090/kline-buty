import type { Candle } from '../chart/types'

/** v0.5 复制 OHLC 文本格式化（右键菜单）：O/H/L/C/V 紧凑文本，8 位小数去尾零 */
export function formatOhlc(c: Pick<Candle, 'open' | 'high' | 'low' | 'close' | 'volume'>): string {
  const f = (n: number) => (Number.isFinite(n) ? Number(n.toFixed(8)).toString() : String(n))
  return `O:${f(c.open)} H:${f(c.high)} L:${f(c.low)} C:${f(c.close)} V:${f(c.volume)}`
}
