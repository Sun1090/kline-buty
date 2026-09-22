import { usePersistedState } from './usePersistedState'
import { DEFAULT_SLIPPAGE_RATIO, MAKER_FEE_RATE, TAKER_FEE_RATE } from '../trade/order'

/**
 * D5/D8 交易参数设置（持久化）：吃单费率 + 挂单费率 + 市价滑点。
 * 市价单走吃单费率与滑点；限价单按触价时的市场价成交，挂在盘口等价的按挂单费率、
 * 下单即跨过价差的按吃单费率（见 `fillFeeRate`）。
 */
export function useTradeSettings() {
  const [takerFeeRate, setTakerFeeRate] = usePersistedState<number>('takerFeeRate', TAKER_FEE_RATE)
  const [makerFeeRate, setMakerFeeRate] = usePersistedState<number>('makerFeeRate', MAKER_FEE_RATE)
  const [slippageRatio, setSlippageRatio] = usePersistedState<number>('slippageRatio', DEFAULT_SLIPPAGE_RATIO)
  return { takerFeeRate, setTakerFeeRate, makerFeeRate, setMakerFeeRate, slippageRatio, setSlippageRatio }
}
