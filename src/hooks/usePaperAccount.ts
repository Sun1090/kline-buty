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
  /** D10 交易时使用的费率（可配置，用于流水明细手续费拆分） */
  feeRate?: number
  /** 仅平仓记录：本次实现盈亏（已含平仓手续费） */
  pnl?: number
}

export const TRADES_MAX = 100

const TRADES_KEY = 'paperTrades'
const SNAPSHOTS_KEY = 'paperSnapshots'

/** D13 账户快照：余额 + 流水（含保存时间） */
export interface PaperSnapshot {
  balance: number
  trades: TradeRecord[]
  savedAt: number
}

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

function loadSnapshots(): Record<string, PaperSnapshot> {
  try {
    const raw = localStorage.getItem('kline-buty:' + SNAPSHOTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, PaperSnapshot>) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistSnapshots(snapshots: Record<string, PaperSnapshot>) {
  try {
    localStorage.setItem('kline-buty:' + SNAPSHOTS_KEY, JSON.stringify(snapshots))
  } catch {
    /* noop */
  }
}

export interface PaperAccountApi {
  /** 可用余额（USDT，模拟起始资金 10,000） */
  balance: number
  /** 成交流水（新记录在前） */
  trades: TradeRecord[]
  clearTrades: () => void
  /** 模拟账户重置：余额回初始 10,000 并清空流水 */
  reset: () => void
  /** 余额是否足够开仓：需要保证金（名义金额）+ 开仓手续费 */
  canOpen: (notional: number, fee: number) => boolean
  /** 开仓记账：扣手续费，写流水 */
  recordOpen: (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number; feeRate?: number }) => void
  /** 平仓记账：结算盈亏 − 平仓手续费，写流水 */
  recordClose: (args: {
    symbol: string
    side: 'buy' | 'sell'
    price: number
    qty: number
    fee: number
    feeRate?: number
    /** 平仓手续费之外的净盈亏（价差部分） */
    pnl: number
  }) => void
  /** D13 快照列表（名称，新在前） */
  snapshots: string[]
  /** D13 保存当前账户为命名快照；空名/重名返回 false */
  saveSnapshot: (name: string) => boolean
  /** D13 载入快照：恢复余额与流水 */
  loadSnapshot: (name: string) => void
  /** D13 删除快照 */
  deleteSnapshot: (name: string) => void
  /** D15 导出账户为 JSON 字符串（余额+流水+版本） */
  exportAccountJson: () => string
  /** D15 从 JSON 字符串导入账户；解析/校验失败返回 false */
  importAccountJson: (json: string) => boolean
}

/** 模拟交易账户：余额（equity 口径）+ 成交流水，持久化 localStorage。
 *  保证金模型：开仓要求 余额 ≥ 名义金额（全额保证金），开仓仅扣手续费；
 *  平仓结算价差盈亏并扣平仓手续费——单仓位模型下与「余额 = 初始资金 + 累计已实现盈亏 − 累计手续费」自洽。 */
export function usePaperAccount(): PaperAccountApi {
  const [balance, setBalance] = usePersistedState<number>('paperBalance', 10_000)
  const [trades, setTrades] = useState<TradeRecord[]>(loadTrades)
  const tradesRef = useRef(trades)
  tradesRef.current = trades
  const [snapshots, setSnapshots] = useState<string[]>(() => Object.keys(loadSnapshots()).reverse())

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
    (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number; feeRate?: number }) => {
      setBalance((b) => b - args.fee)
      pushTrade({ ...args, kind: 'open' })
    },
    [pushTrade, setBalance],
  )

  const recordClose = useCallback(
    (args: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number; fee: number; feeRate?: number; pnl: number }) => {
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

  /** 模拟账户重置：恢复初始资金 10,000 并清空全部流水 */
  const reset = useCallback(() => {
    setBalance(10_000)
    persistTrades([])
    try {
      localStorage.removeItem('kline-buty:' + TRADES_KEY)
    } catch {
      /* noop */
    }
  }, [persistTrades, setBalance])

  /** D13 保存当前账户为命名快照；空名/重名返回 false */
  const saveSnapshot = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return false
      const all = loadSnapshots()
      if (all[trimmed]) return false
      all[trimmed] = { balance, trades: tradesRef.current, savedAt: Date.now() }
      persistSnapshots(all)
      setSnapshots(Object.keys(all).reverse())
      return true
    },
    [balance],
  )

  /** D13 载入快照：恢复余额与流水 */
  const loadSnapshot = useCallback(
    (name: string) => {
      const all = loadSnapshots()
      const snap = all[name]
      if (!snap) return
      setBalance(snap.balance)
      persistTrades(snap.trades.slice(0, TRADES_MAX))
    },
    [persistTrades, setBalance],
  )

  /** D13 删除快照 */
  const deleteSnapshot = useCallback((name: string) => {
    const all = loadSnapshots()
    delete all[name]
    persistSnapshots(all)
    setSnapshots(Object.keys(all).reverse())
  }, [])

  /** D15 导出账户 JSON：版本 + 余额 + 流水 + 时间戳 */
  const exportAccountJson = useCallback(
    () =>
      JSON.stringify(
        { version: 1, balance, trades: tradesRef.current, savedAt: Date.now() },
        null,
        2,
      ),
    [balance],
  )

  /** D15 导入账户 JSON：校验 shape 后恢复余额与流水；失败返回 false 且不改动当前账户 */
  const importAccountJson = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as { version?: number; balance?: unknown; trades?: unknown }
        if (typeof parsed.balance !== 'number' || !Number.isFinite(parsed.balance)) return false
        if (!Array.isArray(parsed.trades)) return false
        const allValid = parsed.trades.every(
          (t): t is TradeRecord =>
            t != null &&
            typeof t === 'object' &&
            typeof (t as TradeRecord).symbol === 'string' &&
            typeof (t as TradeRecord).price === 'number' &&
            typeof (t as TradeRecord).qty === 'number' &&
            typeof (t as TradeRecord).fee === 'number' &&
            ((t as TradeRecord).kind === 'open' || (t as TradeRecord).kind === 'close'),
        )
        if (!allValid) return false
        setBalance(parsed.balance)
        persistTrades(parsed.trades.slice(0, TRADES_MAX))
        return true
      } catch {
        return false
      }
    },
    [persistTrades, setBalance],
  )

  return {
    balance,
    trades,
    clearTrades,
    reset,
    canOpen,
    recordOpen,
    recordClose,
    snapshots,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    exportAccountJson,
    importAccountJson,
  }
}
