import { useMemo } from 'react'

/** 常用交易对（置顶显示，带快照） */
export const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']

/** 内置主流 USDT 现货交易对（避免 17MB 的 exchangeInfo 全量请求） */
export const SYMBOL_LIST: string[] = [
  ...POPULAR_SYMBOLS,
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'UNIUSDT',
  'ATOMUSDT', 'NEARUSDT', 'ALGOUSDT', 'ICPUSDT', 'FILUSDT', 'ETCUSDT', 'TRXUSDT',
  'SHIBUSDT', 'APEUSDT', 'POLUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'APTUSDT',
  'INJUSDT', 'TIAUSDT', 'SEIUSDT', 'WIFUSDT', 'PEPEUSDT', 'BONKUSDT', 'FLOKIUSDT',
  'ORDIUSDT', '1000SATSUSDT', 'JUPUSDT', 'JTOUSDT', 'PYTHUSDT', 'RNDRUSDT',
  'GRTUSDT', 'IMXUSDT', 'STXUSDT', 'AAVEUSDT', 'MKRUSDT', 'CRVUSDT', 'COMPUSDT',
  'SNXUSDT', 'LDOUSDT', 'ENSUSDT', 'DYDXUSDT', 'GALAUSDT', 'SANDUSDT', 'MANAUSDT',
  'AXSUSDT', 'THETAUSDT', 'FTMUSDT', 'HBARUSDT', 'VETUSDT', 'EGLDUSDT',
  'RONINUSDT', 'TONUSDT', 'WLDUSDT', 'MEMEUSDT', 'PENDLEUSDT', 'ENAUSDT', 'ETHFIUSDT',
]

/**
 * USDT 现货交易对列表（内置常量，无需网络请求）。
 */
export function useSymbolList(): string[] {
  return SYMBOL_LIST
}

/** 搜索过滤（纯函数，可单测）：大小写不敏感，匹配前缀优先 */
export function filterSymbols(all: string[], query: string, limit = 20): string[] {
  const q = query.trim().toUpperCase()
  if (!q) return all.slice(0, limit)
  const exact = all.filter((s) => s.startsWith(q))
  const contains = all.filter((s) => s.includes(q) && !s.startsWith(q))
  return [...exact, ...contains].slice(0, limit)
}

/** 过滤后按用户查询分组（避免 useMemo 依赖数组不稳定） */
export function useFilteredSymbols(query: string): string[] {
  return useMemo(() => filterSymbols(SYMBOL_LIST, query), [query])
}
