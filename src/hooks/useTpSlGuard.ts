import { useEffect, useRef } from 'react'
import { calcPnl, type Position } from '../position/pnl'
import { feeForPrice, type OrderSide } from '../trade/order'
import { EMPTY_POSITIONS, settleSlot, type Positions } from '../trade/positions'
import { planTpSlExits, type TpSlExit } from '../trade/tpsl'

type PositionsBySymbol = Record<string, Positions>

/** 与既有 claim key 同构：品种+槽位+开仓价+触发价，同一轮重跑（StrictMode 双跑）只结算一次 */
function claimKey(e: TpSlExit): string {
  return `${e.symbol}:${e.slot}:${e.entry}:${e.price}`
}

export interface TpSlGuardDeps {
  positionsBySymbol: PositionsBySymbol
  /** 当前图表品种由 K 线级结算负责，守护只盯其他品种 */
  currentSymbol: string
  /** 其他品种的轮询最新价（?perf 压测模式下为空 → 守护天然静默，不违反不联网契约） */
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
  /** 本轮结算结果回调（横幅提示由调用方决定） */
  onExit?: (exits: TpSlExit[]) => void
}

/**
 * 跨品种止盈/止损守护：切走图表后，其他品种的持仓仍按 30s 轮询最新价判定 TP/SL，
 * 命中即按最新价结算并写流水——与停留在该品种图表时的行为一致（那边是 K 线/tick 粒度）。
 */
export function useTpSlGuard(deps: TpSlGuardDeps): void {
  const { positionsBySymbol, currentSymbol, prices, takerFeeRate, recordClose, setPositionsBySymbol, onExit } = deps
  const claimedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const exits = planTpSlExits(positionsBySymbol, (sym) =>
      sym === currentSymbol ? null : prices[sym] ?? null,
    ).filter((e) => !claimedRef.current.has(claimKey(e)))
    if (exits.length === 0) return
    for (const e of exits) claimedRef.current.add(claimKey(e))

    for (const e of exits) {
      const position: Position = { entry: e.entry, quantity: e.qty, direction: e.direction }
      const { pnl } = calcPnl(position, e.price)
      recordClose({
        symbol: e.symbol,
        // 与 App 内既有结算路径同约定：平仓流水的 side 记的是被平掉的方向（流水面板按此显示多/空）
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
  }, [positionsBySymbol, currentSymbol, prices, takerFeeRate, recordClose, setPositionsBySymbol, onExit])
}
