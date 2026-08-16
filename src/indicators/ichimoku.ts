import type { Candle } from '../chart/types'
import type { ValuePoint } from './sma'

export interface IchimokuOptions {
  tenkanPeriod?: number
  kijunPeriod?: number
  senkouBPeriod?: number
  displacement?: number
  /** 周期秒数：先行带（spanA/spanB）向未来平移 displacement×periodSeconds */
  periodSeconds?: number
}

export interface IchimokuResult {
  /** 转换线（9 周期中值） */
  tenkan: ValuePoint[]
  /** 基准线（26 周期中值） */
  kijun: ValuePoint[]
  /** 先行带 A = (tenkan+kijun)/2，向未来平移 26 根 */
  spanA: ValuePoint[]
  /** 先行带 B = 52 周期中值，向未来平移 26 根 */
  spanB: ValuePoint[]
  /** 迟行线 = 收盘价向过去平移 26 根 */
  chikou: ValuePoint[]
}

/** 以 i 为终点、长度 period 的窗口内 (最高价+最低价)/2 */
function midPrice(candles: Candle[], i: number, period: number): number {
  let hi = -Infinity
  let lo = Infinity
  for (let j = i - period + 1; j <= i; j++) {
    if (candles[j].high > hi) hi = candles[j].high
    if (candles[j].low < lo) lo = candles[j].low
  }
  return (hi + lo) / 2
}

/** 标准 Ichimoku 云图：转换线 9 / 基准线 26 / 先行带 B 52 / 位移 26。 */
export function calcIchimoku(
  candles: Candle[],
  opts: IchimokuOptions = {},
): IchimokuResult {
  const tenkanPeriod = opts.tenkanPeriod ?? 9
  const kijunPeriod = opts.kijunPeriod ?? 26
  const senkouBPeriod = opts.senkouBPeriod ?? 52
  const displacement = opts.displacement ?? 26

  const tenkan: ValuePoint[] = []
  const kijun: ValuePoint[] = []
  const spanA: ValuePoint[] = []
  const spanB: ValuePoint[] = []
  const chikou: ValuePoint[] = []

  // 云图需要 spanA/spanB 都有效且按索引对齐：起点取三个周期中的最大者
  const spanStart = Math.max(tenkanPeriod, kijunPeriod, senkouBPeriod) - 1

  for (let i = 0; i < candles.length; i++) {
    if (i >= tenkanPeriod - 1) tenkan.push({ time: candles[i].time, value: midPrice(candles, i, tenkanPeriod) })
    if (i >= kijunPeriod - 1) kijun.push({ time: candles[i].time, value: midPrice(candles, i, kijunPeriod) })
    // 迟行线：当前收盘价平移到 26 根前
    if (i >= displacement) chikou.push({ time: candles[i].time, value: candles[i - displacement].close })
  }

  for (let i = spanStart; i < candles.length; i++) {
    const tIdx = i - tenkanPeriod + 1
    const kIdx = i - kijunPeriod + 1
    const a = (tenkan[tIdx].value + kijun[kIdx].value) / 2
    const b = midPrice(candles, i, senkouBPeriod)
    const future =
      opts.periodSeconds !== undefined
        ? candles[i].time + displacement * opts.periodSeconds
        : candles[i + displacement]?.time
    if (future === undefined) continue
    spanA.push({ time: future, value: a })
    spanB.push({ time: future, value: b })
  }

  return { tenkan, kijun, spanA, spanB, chikou }
}

export interface IchimokuCloudPoint {
  time: number
  /** 云带上边界 = max(spanA, spanB) */
  top: number
  /** 云带下边界 = min(spanA, spanB) */
  bottom: number
  /** spanA >= spanB 视为多头（涨色），否则空头（跌色） */
  bull: boolean
}

/** 由 spanA/spanB 对齐生成云带填充数据（按时间对齐）。 */
export function ichimokuCloud(r: IchimokuResult): IchimokuCloudPoint[] {
  const out: IchimokuCloudPoint[] = []
  const n = Math.min(r.spanA.length, r.spanB.length)
  for (let i = 0; i < n; i++) {
    const a = r.spanA[i].value
    const b = r.spanB[i].value
    out.push({ time: r.spanA[i].time, top: Math.max(a, b), bottom: Math.min(a, b), bull: a >= b })
  }
  return out
}
