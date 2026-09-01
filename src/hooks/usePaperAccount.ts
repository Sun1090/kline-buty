import { useCallback, useRef, useState } from 'react'
import { usePersistedState } from './usePersistedState'

/** 一笔模拟成交流水（新记录在前，上限 TRADES_MAX） */
export interface TradeRecord {
  id: string
  /** 成交时间戳（ms） */
  at: number
  symbol: string
  /** 开仓方向：buy=做多 / sell=做空 */
  side: 'buy' | 'sell'
  kind: 'open' | 'close'
  price: number
  qty: number
  fee: number
  /** 仅平仓记录：本次实现盈亏（已含平仓手续费） */
  pnl?: number
}

export const TRADES_MAX = 100

const TRADES_KEY = 'paperTrades'

function loadTrades(): TradeRecord[] {
  try {
    const raw = localStorage.getItem('kline-buty:' + TRADES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TradeRecord[]
    return Array.isArray(parsed) ? parsed.slice(0, TRADES_MAX) : []
  } catch {
    return []
  }
}

export interface PaperAccountApi {
  /** 可用余额（USDT，模拟起始资金 10,000） */
  balance: number
  /** 成交流水（新记录在前） */
  trades: TradeRecord[]
  clearTrades: () => void
  /** D15 模拟账户重置：余额回初始 10,000 并清空流水 */
  reset: () => void
  /** 余额是否足够开仓：需要保证金（名义金额）+ 开仓手续费 */
  canOpen: (notional: number, fee: number) => boolean
  /** 开仓记账：扣手续费，写流水 */
  recordOpen: (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number }) => void
  /** 平仓记账：结算盈亏 − 平仓手续费，写流水 */
  recordClose: (args: {
    symbol: string
    side: 'buy' | 'sell'
    price: number
    qty: number
    fee: number
    /** 平仓手续费之外的净盈亏（价差部分） */
    pnl: number
  }) => void
}

/** 模拟交易账户：余额（equity 口径）+ 成交流水，持久化 localStorage。
 *  保证金模型：开仓要求 余额 ≥ 名义金额（全额保证金），开仓仅扣手续费；
 *  平仓结算价差盈亏并扣平仓手续费——单仓位模型下与「余额 = 初始资金 + 累计已实现盈亏 − 累计手续费」自洽。 */
export function usePaperAccount(): PaperAccountApi {
  const [balance, setBalance] = usePersistedState<number>('paperBalance', 10_000)
  const [trades, setTrades] = useState<TradeRecord[]>(loadTrades)
  const tradesRef = useRef(trades)
  tradesRef.current = trades

  const persistTrades = useCallback((next: TradeRecord[]) => {
    const capped = next.slice(0, TRADES_MAX)
    setTrades(capped)
    try {
      localStorage.setItem('kline-buty:' + TRADES_KEY, JSON.stringify(capped))
    } catch {
      /* noop */
    }
  }, [])

  const pushTrade = useCallback(
    (rec: Omit<TradeRecord, 'id' | 'at'>) => {
      // 函数式更新：同一批次内连续多次调用（开仓后立即平仓/批量回放）不丢记录；
      // updater 内同步 ref 与 localStorage（StrictMode 双调用下为幂等重写，无害）
      setTrades((prev) => {
        const next = [
          { ...rec, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now() },
          ...prev,
        ].slice(0, TRADES_MAX)
        tradesRef.current = next
        try {
          localStorage.setItem('kline-buty:' + TRADES_KEY, JSON.stringify(next))
        } catch {
          /* noop */
        }
        return next
      })
    },
    [],
  )

  const canOpen = useCallback((notional: number, fee: number) => balance >= notional + fee, [balance])

  const recordOpen = useCallback(
    (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number }) => {
      setBalance((b) => b - args.fee)
      pushTrade({ ...args, kind: 'open' })
    },
    [pushTrade, setBalance],
  )

  const recordClose = useCallback(
    (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number; pnl: number }) => {
      // 结算：+ 价差盈亏 − 平仓手续费
      setBalance((b) => b + args.pnl - args.fee)
      pushTrade({ ...args, kind: 'close', pnl: args.pnl - args.fee })
    },
    [pushTrade, setBalance],
  )

  const clearTrades = useCallback(() => {
    persistTrades([])
    try {
      localStorage.removeItem('kline-buty:' + TRADES_KEY)
    } catch {
      /* noop */
    }
  }, [persistTrades])

  /** D15 模拟账户重置：恢复初始资金 10,000 并清空全部流水 */
  const reset = useCallback(() => {
    setBalance(10_000)
    persistTrades([])
    try {
      localStorage.removeItem('kline-buty:' + TRADES_KEY)
    } catch {
      /* noop */
    }
  }, [persistTrades, setBalance])

  return { balance, trades, clearTrades, reset, canOpen, recordOpen, recordClose }
}
