import { usePersistedState } from './usePersistedState'
import { DEFAULT_SLIPPAGE_RATIO, TAKER_FEE_RATE } from '../trade/order'

/**
 * D5/D8 交易参数设置（持久化）：吃单费率 + 市价滑点。
 * 应用于下单估算与平仓计费（feeRate），滑点影响市价单成交价。
 */
export function useTradeSettings() {
  const [takerFeeRate, setTakerFeeRate] = usePersistedState<number>('takerFeeRate', TAKER_FEE_RATE)
  const [slippageRatio, setSlippageRatio] = usePersistedState<number>('slippageRatio', DEFAULT_SLIPPAGE_RATIO)
  return { takerFeeRate, setTakerFeeRate, slippageRatio, setSlippageRatio }
}