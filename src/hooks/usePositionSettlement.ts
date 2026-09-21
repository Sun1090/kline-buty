import { useEffect, useRef } from 'react'
import { calcPnl, type Position } from '../position/pnl'
import { feeForPrice, type OrderSide } from '../trade/order'
import { EMPTY_POSITIONS, settleSlot, type Positions } from '../trade/positions'
import { planTpSlExits, planTrailMoves, type TpSlExit } from '../trade/tpsl'

type PositionsBySymbol = Record<string, Positions>

/** claim key = 品种+槽位+开仓价+触发价：同一轮重跑（StrictMode 双跑、价源换引用）只结算一次 */
function claimKey(e: TpSlExit): string {
  return `${e.symbol}:${e.slot}:${e.entry}:${e.price}`
}

export interface SettlementDeps {
  positionsBySymbol: PositionsBySymbol
  /** 当前图表品种的实时价（K 线最新收盘价） */
  live: { symbol: string; price: number } | null
  /** 其他品种的 30s 轮询最新价（?perf 压测模式下为空 → 非当前品种天然静默） */
  prices: Record<string, number>
  takerFeeRate: number
  recordClose: (args: {
    symbol: string
    side: OrderSide
    price: number
    qty: number
    fee: number
    feeRate: number
    pnl: number
  }) => void
  setPositionsBySymbol: (fn: (prev: PositionsBySymbol) => PositionsBySymbol) => void
  /** 自动结算过的持仓对象：与 App 的显式平仓簿记共享，避免同一笔持仓记两次 */
  autoSettled: WeakSet<Position>
  /** 本轮结算结果回调（横幅提示由调用方决定） */
  onExit?: (exits: TpSlExit[]) => void
}

/**
 * 止盈/止损结算循环：所有品种的持仓统一按各自价源判定 TP/止损，
 * 命中即平掉对应槽位、按既有流水口径记账并清空槽位；带移动止损的持仓先把止损朝有利方向推进。
 * 当前图表品种用 K 线最新价（tick 级），其他品种用轮询价（30s 级）。
 */
export function usePositionSettlement(deps: SettlementDeps): void {
  const { positionsBySymbol, live, prices, takerFeeRate, recordClose, setPositionsBySymbol, autoSettled, onExit } = deps
  const claimedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const priceOf = (sym: string) => (live && live.symbol === sym ? live.price : prices[sym] ?? null)
    const exits = planTpSlExits(positionsBySymbol, priceOf).filter(
      (e) => !claimedRef.current.has(claimKey(e)),
    )
    // 移动止损：先写回推进了的止损线，再处理本轮平仓（已平仓的槽位不再写）
    const settled = new Set(exits.map((e) => `${e.symbol}:${e.slot}`))
    const moves = planTrailMoves(positionsBySymbol, priceOf).filter(
      (m) => !settled.has(`${m.symbol}:${m.slot}`),
    )
    if (moves.length > 0) {
      setPositionsBySymbol((prev) => {
        const next = { ...prev }
        for (const m of moves) {
          const slots = next[m.symbol] ?? EMPTY_POSITIONS
          next[m.symbol] = { ...slots, [m.slot]: { ...slots[m.slot]!, stopLoss: m.stop } }
        }
        return next
      })
    }
    if (exits.length === 0) return
    for (const e of exits) claimedRef.current.add(claimKey(e))

    for (const e of exits) {
      autoSettled.add(e.source)
      const { pnl } = calcPnl(e.source, e.price)
      recordClose({
        symbol: e.symbol,
        // 平仓流水的 side 记被平掉的方向（流水面板据此显示多/空）
        side: e.direction === 'long' ? 'buy' : 'sell',
        price: e.price,
        qty: e.qty,
        fee: feeForPrice(e.entry, e.qty, takerFeeRate),
        feeRate: takerFeeRate,
        pnl,
      })
      setPositionsBySymbol((prev) => {
        const { next } = settleSlot(prev[e.symbol] ?? EMPTY_POSITIONS, e.slot)
        return { ...prev, [e.symbol]: next }
      })
    }
    onExit?.(exits)
  }, [positionsBySymbol, live, prices, takerFeeRate, recordClose, setPositionsBySymbol, autoSettled, onExit])
}
