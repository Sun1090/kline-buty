import { useCallback, useRef, useState } from 'react'
import { canAddOrder, parsePendingOrders, type PendingOrder } from '../trade/pending'

const ORDERS_KEY = 'paperOrders'
/** 全局挂单条数上限（超出丢弃最旧，防止列表无限增长） */
export const PENDING_MAX = 50

function loadOrders(): PendingOrder[] {
  try {
    const raw = localStorage.getItem('kline-buty:' + ORDERS_KEY)
    return raw ? parsePendingOrders(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

function persistOrders(next: PendingOrder[]) {
  try {
    localStorage.setItem('kline-buty:' + ORDERS_KEY, JSON.stringify(next))
  } catch {
    /* 存储不可用时静默（隐私模式等） */
  }
}

export interface PendingOrdersApi {
  orders: PendingOrder[]
  /** 新增挂单（同品种上限 + 全局条数裁剪）；被拒绝时返回 false */
  add: (order: PendingOrder) => boolean
  /** 按 id 批量移除（用户撤销 / 撮合落地） */
  remove: (ids: string[]) => void
  clear: () => void
  /** 该品种是否还能挂单（同品种上限 + 全局上限） */
  canAdd: (symbol: string) => boolean
}

/** 限价挂单列表：localStorage 持久化（与模拟账户同前缀），损坏数据读取即清洗 */
export function usePendingOrders(): PendingOrdersApi {
  const [orders, setOrders] = useState<PendingOrder[]>(loadOrders)
  // add 需同步返回是否受理，故用渲染外最新快照做判定（同 usePaperAccount 的 tradesRef 约定）
  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const add = useCallback((order: PendingOrder) => {
    if (!canAddOrder(ordersRef.current, order.symbol) || ordersRef.current.length >= PENDING_MAX) return false
    setOrders((prev) => {
      const next = [...prev, order].slice(-PENDING_MAX)
      persistOrders(next)
      return next
    })
    return true
  }, [])

  const remove = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setOrders((prev) => {
      const drop = new Set(ids)
      const next = prev.filter((o) => !drop.has(o.id))
      if (next.length === prev.length) return prev
      persistOrders(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setOrders((prev) => {
      if (prev.length === 0) return prev
      persistOrders([])
      return []
    })
  }, [])

  const canAdd = useCallback(
    (symbol: string) => canAddOrder(ordersRef.current, symbol) && ordersRef.current.length < PENDING_MAX,
    [],
  )

  return { orders, add, remove, clear, canAdd }
}
