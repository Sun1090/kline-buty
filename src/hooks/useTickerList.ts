import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTickers24h, type TickerRow } from '../data/binance/rest'
import { SYMBOL_LIST } from './useSymbolList'

export type TickerSortKey = 'symbol' | 'price' | 'changePct' | 'quoteVolume'
export type SortDir = 'asc' | 'desc'

/** 排序纯函数：symbol 按字典序，数值列按大小；dir 控制升降序 */
export function sortTickerRows(rows: TickerRow[], key: TickerSortKey, dir: SortDir): TickerRow[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'symbol') return a.symbol.localeCompare(b.symbol) * factor
    return (a[key] - b[key]) * factor
  })
}

export interface TickerListState {
  rows: TickerRow[]
  loading: boolean
  error: boolean
  sortKey: TickerSortKey
  sortDir: SortDir
  setSortKey: (k: TickerSortKey) => void
  refresh: () => void
}

const REFRESH_MS = 30_000

/**
 * 行情列表：对内置交易对批量拉取 24h 摘要，30s 轮询 + 手动刷新。
 * 失败优雅降级（保留旧数据，置 error 标记）；排序状态由组件内维护。
 */
export function useTickerList(symbols: string[] = SYMBOL_LIST): TickerListState {
  const [rows, setRows] = useState<TickerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sort, setSort] = useState<{ key: TickerSortKey; dir: SortDir }>({ key: 'symbol', dir: 'asc' })

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTickers24h(symbols)
      setRows(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [symbols])

  useEffect(() => {
    setLoading(true)
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const setSortKey = useCallback((k: TickerSortKey) => {
    setSort((prev) =>
      prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' },
    )
  }, [])

  const sorted = useMemo(() => sortTickerRows(rows, sort.key, sort.dir), [rows, sort.key, sort.dir])

  return { rows: sorted, loading, error, sortKey: sort.key, sortDir: sort.dir, setSortKey, refresh }
}
