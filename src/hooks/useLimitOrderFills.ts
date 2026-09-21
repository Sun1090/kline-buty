import { useEffect, useRef } from 'react'
import { matchPendingOrders, planFills, type PendingOrder } from '../trade/pending'
import { EMPTY_POSITIONS, applyOrder, type Positions } from '../trade/positions'
import type { OrderSide } from '../trade/order'

type PositionsBySymbol = Record<string, Positions>

export interface OrderNotice {
  id: number
  kind: 'filled' | 'cancelled'
  symbol: string
  qty: number
  price: number
}

export interface LimitOrderFillDeps {
  orders: PendingOrder[]
  /** 撮合后从挂单列表移除（成交 + 因余额不足撤销） */
  remove: (ids: string[]) => void
  balance: number
  /** 记账开仓（成交价 = 挂单价，手续费按挂单费率） */
  recordOpen: (args: { symbol: string; side: OrderSide; price: number; qty: number; fee: number; feeRate: number }) => void
  /** 写回某品种持仓（hedge 模式合并；支持非当前图表品种） */
  setPositionsBySymbol: (fn: (prev: PositionsBySymbol) => PositionsBySymbol) => void
  makerFeeRate: number
  /** 当前图表品种的最新价（K 线级，优先于轮询价表） */
  live: { symbol: string; price: number } | null
  /** 其他品种的 30s 轮询最新价 */
  prices: Record<string, number>
  /** 撮合结果回调（成交/撤销），由调用方决定如何提示 */
  onNotice?: (notice: OrderNotice) => void
}

/**
 * 限价挂单撮合循环：任一品种价格触达挂单价即按挂单价成交（Maker 单、无滑点），
 * 余额承接不下的按 FIFO 撤销。
 * settledRef 记录已处理订单 id 保证幂等：deps 抖动或 StrictMode 双跑都不会重复记账。
 */
export function useLimitOrderFills(deps: LimitOrderFillDeps): void {
  const { orders, remove, balance, recordOpen, setPositionsBySymbol, makerFeeRate, live, prices, onNotice } = deps
  const settledRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (orders.length === 0) return
    const { filled } = matchPendingOrders(orders, (sym) =>
      live && live.symbol === sym ? live.price : prices[sym] ?? null,
    )
    const fresh = filled.filter((o) => !settledRef.current.has(o.id))
    if (fresh.length === 0) return
    for (const order of fresh) settledRef.current.add(order.id)

    const { accepted, rejected } = planFills(fresh, balance, makerFeeRate)
    remove([...accepted.map((a) => a.order.id), ...rejected.map((o) => o.id)])

    for (const { order, fee } of accepted) {
      recordOpen({
        symbol: order.symbol,
        side: order.side,
        price: order.price,
        qty: order.qty,
        fee,
        feeRate: makerFeeRate,
      })
      setPositionsBySymbol((prev) => ({
        ...prev,
        [order.symbol]: applyOrder(prev[order.symbol] ?? EMPTY_POSITIONS, order.side, order.price, order.qty),
      }))
    }

    const first = accepted[0]?.order ?? rejected[0]
    if (first) {
      onNotice?.({
        id: Date.now(),
        kind: accepted.length > 0 ? 'filled' : 'cancelled',
        symbol: first.symbol,
        qty: first.qty,
        price: first.price,
      })
    }
  }, [orders, remove, balance, recordOpen, setPositionsBySymbol, makerFeeRate, live, prices, onNotice])
}
