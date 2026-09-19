import type { TradeRecord } from '../hooks/usePaperAccount'

/**
 * v0.5.x 模拟成交图面标记（纯函数）：把成交流水转为主图 B/S 落点。
 * 时间戳与 K 线同口径（秒）；方向色 buy=涨绿 / sell=跌红。
 */

export interface TradeChartMarker {
  /** K 线秒单位时间戳（candle.time 同口径） */
  time: number
  price: number
  side: 'buy' | 'sell'
}

/** 某品种成交流水 → 图面标记：按时间升序、取最近 N 条防遮挡。 */
export function tradeMarkersFor(trades: TradeRecord[], symbol: string, max = 60): TradeChartMarker[] {
  return trades
    .filter((t) => t.symbol === symbol)
    .sort((a, b) => a.at - b.at)
    .slice(-max)
    .map((t) => ({ time: Math.floor(t.at / 1000), price: t.price, side: t.side }))
}
