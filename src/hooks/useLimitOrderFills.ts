import { useEffect, useRef } from 'react'
import { fillFeeRate, fillPrice, levelsAtFill, matchPendingOrders, planFills, type PendingOrder } from '../trade/pending'
import { DEFAULT_SL_PCT, DEFAULT_TP_PCT, EMPTY_POSITIONS, applyOrder, type Positions } from '../trade/positions'
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
  /** 记账开仓（成交价为挂单价或改善后的市场价，费率按该单是否跨价差取 Maker / Taker） */
  recordOpen: (args: { symbol: string; side: OrderSide; price: number; qty: number; fee: number; feeRate: number }) => void
  /** 写回某品种持仓（hedge 模式合并；支持非当前图表品种） */
  setPositionsBySymbol: (fn: (prev: PositionsBySymbol) => PositionsBySymbol) => void
  makerFeeRate: number
  /** 下单即跨过价差的限价单按吃单计，用 Taker 费率 */
  takerFeeRate: number
  /** 当前图表品种的最新价（K 线级，优先于轮询价表） */
  live: { symbol: string; price: number } | null
  /** 其他品种的 30s 轮询最新价 */
  prices: Record<string, number>
  /** 撮合结果回调（成交/撤销），由调用方决定如何提示 */
  onNotice?: (notice: OrderNotice) => void
}

/**
 * 限价挂单撮合循环：任一品种价格触达挂单价即成交（无滑点），市场价更优时按市场价成交，
 * 余额承接不下的按 FIFO 撤销。费率按挂单性质分：等价的挂单算 Maker、
 * 下单即跨过价差的算 Taker。
 * settledRef 记录已处理订单 id 保证幂等：deps 抖动或 StrictMode 双跑都不会重复记账。
 */
export function useLimitOrderFills(deps: LimitOrderFillDeps): void {
  const { orders, remove, balance, recordOpen, setPositionsBySymbol, makerFeeRate, takerFeeRate, live, prices, onNotice } = deps
  const settledRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (orders.length === 0) return
    const priceOf = (sym: string) => (live && live.symbol === sym ? live.price : prices[sym] ?? null)
    const { filled } = matchPendingOrders(orders, priceOf)
    const fresh = filled.filter((o) => !settledRef.current.has(o.id))
    if (fresh.length === 0) return
    for (const order of fresh) settledRef.current.add(order.id)

    // 市场价优于挂单价 → 按市场价成交（价格改善），持仓与流水都记这个价
    const rates = { maker: makerFeeRate, taker: takerFeeRate }
    const { accepted, rejected } = planFills(fresh, balance, (o) => fillFeeRate(o, rates), (o) => fillPrice(o, priceOf(o.symbol)))
    remove([...accepted.map((a) => a.order.id), ...rejected.map((o) => o.id)])

    for (const { order, fee } of accepted) {
      const price = fillPrice(order, priceOf(order.symbol))
      recordOpen({
        symbol: order.symbol,
        side: order.side,
        price,
        qty: order.qty,
        fee,
        feeRate: fillFeeRate(order, rates),
      })
      setPositionsBySymbol((prev) => ({
        ...prev,
        [order.symbol]: applyOrder(
          prev[order.symbol] ?? EMPTY_POSITIONS,
          order.side,
          price,
          order.qty,
          DEFAULT_TP_PCT,
          DEFAULT_SL_PCT,
          { ...levelsAtFill(order, price), leverage: order.leverage ?? null },
        ),
      }))
    }

    const noticeOrder = accepted[0]?.order ?? rejected[0]
    if (noticeOrder) {
      onNotice?.({
        id: Date.now(),
        kind: accepted.length > 0 ? 'filled' : 'cancelled',
        symbol: noticeOrder.symbol,
        qty: noticeOrder.qty,
        price: fillPrice(noticeOrder, priceOf(noticeOrder.symbol)),
      })
    }
  }, [orders, remove, balance, recordOpen, setPositionsBySymbol, makerFeeRate, takerFeeRate, live, prices, onNotice])
}
