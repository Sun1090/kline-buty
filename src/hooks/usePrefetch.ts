import { useEffect } from 'react'
import type { Period } from '../chart/types'
import { fetchKlines } from '../data/binance/rest'
import { writeCachedCandles, readCachedCandles } from '../data/cache'
import { SYMBOL_LIST } from './useSymbolList'

/**
 * N7 数据预取：空闲时（requestIdleCallback）把「相邻品种 + 当前品种更早历史」拉取并写入本地缓存，
 * 用户后续切换/回看时秒开（命中 A13 缓存），不阻塞当前数据流。
 *
 * 设计：
 * - 相邻品种取 SYMBOL_LIST 中当前位置前后各 2 个（不预取当前品种自身，避免重复请求）；
 * - 每个品种预取当前周期的最近 PAGE 根，成功后写缓存；
 * - 低优先级：requestIdleCallback 空闲执行；无空闲回调（老环境）退化为 setTimeout 0 + 立即 cancelable；
 * - 幂等：同 (symbol,period) 已在缓存则不重复请求；卸载中止。
 */

const PAGE = 500
const ADJACENT = 2

/** 相邻品种列表（当前品种位置前后各 ADJACENT 个；环绕处理） */
export function adjacentSymbols(symbol: string, list: string[] = SYMBOL_LIST): string[] {
  const idx = list.indexOf(symbol)
  if (idx < 0) return []
  const out: string[] = []
  for (let i = 1; i <= ADJACENT; i++) {
    const prev = list[(idx - i + list.length) % list.length]
    const next = list[(idx + i) % list.length]
    if (prev !== symbol && !out.includes(prev)) out.push(prev)
    if (next !== symbol && !out.includes(next)) out.push(next)
  }
  return out
}

/** 预取单个品种：已有缓存则跳过；拉取成功写缓存 */
export async function prefetchSymbol(symbol: string, period: Period): Promise<void> {
  const cached = readCachedCandles(symbol, period)
  if (cached && cached.length > 0) return
  try {
    const hist = await fetchKlines(symbol, period, PAGE)
    if (hist.length > 0) writeCachedCandles(symbol, period, hist)
  } catch {
    // 网络/限流失败静默，下次空闲再试
  }
}

/** N7 hook：空闲时预取相邻品种 + 当前品种更早历史到缓存 */
export function usePrefetch(symbol: string, period: Period) {
  useEffect(() => {
    const targets = adjacentSymbols(symbol)
    if (targets.length === 0) return
    let cancelled = false

    const run = async () => {
      if (cancelled) return
      // 相邻品种 + 当前品种（当前品种拉更早历史兜底分页）
      const jobs = [...targets, symbol]
      for (const s of jobs) {
        if (cancelled) return
        await prefetchSymbol(s, period)
      }
    }

    const schedule = window.requestIdleCallback?.(run, { timeout: 3000 })
    if (schedule === undefined) {
      const t = window.setTimeout(() => void run(), 0)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }
    return () => {
      cancelled = true
      window.cancelIdleCallback?.(schedule)
    }
  }, [symbol, period])
}
