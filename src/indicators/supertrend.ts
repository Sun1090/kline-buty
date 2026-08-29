import type { Candle } from '../chart/types'
import { calcATR } from './extras'
import type { ValuePoint } from './sma'

export interface SupertrendResult {
  /** 趋势向上段（价格下方支撑轨，UI 层用涨色渲染） */
  up: ValuePoint[]
  /** 趋势向下段（价格上方压力轨，UI 层用跌色渲染） */
  down: ValuePoint[]
  /** 全量点（含趋势方向，供测试与调试） */
  raw: { time: number; value: number; bull: boolean }[]
}

/**
 * Supertrend：中轨 = (H+L)/2，轨道 = 中轨 ± mult×ATR(period)，轨道棘轮单向下移/上移，
 * 收盘穿越对侧轨道时趋势翻转。翻转 K 线的点同时落入 up/down 两段，两条线在该点竖向衔接。
 */
export function calcSupertrend(candles: Candle[], period = 10, mult = 3): SupertrendResult {
  const atrByTime = new Map(calcATR(candles, period).map((p) => [p.time, p.value]))
  const up: ValuePoint[] = []
  const down: ValuePoint[] = []
  const raw: { time: number; value: number; bull: boolean }[] = []

  let prevUpper: number | null = null
  let prevLower: number | null = null
  let bull = true

  for (let i = 0; i < candles.length; i++) {
    const atr = atrByTime.get(candles[i].time)
    if (atr === undefined) continue
    const c = candles[i]
    const mid = (c.high + c.low) / 2
    const basicUpper = mid + mult * atr
    const basicLower = mid - mult * atr

    let prevBull: boolean | null = null
    if (prevUpper === null || prevLower === null) {
      // 首个可计算点：轨道取基础值，趋势按收盘相对中轨方向播种
      prevUpper = basicUpper
      prevLower = basicLower
      bull = c.close >= mid
    } else {
      const prevClose = candles[i - 1].close
      prevUpper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper
      prevLower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower
      // 趋势翻转：收盘上穿前上轨转多、下穿前下轨转空
      prevBull = bull
      if (bull && c.close < prevLower) bull = false
      else if (!bull && c.close > prevUpper) bull = true
    }

    const value = bull ? prevLower : prevUpper
    const point = { time: c.time, value }
    raw.push({ time: c.time, value, bull })
    if (prevBull !== null && prevBull !== bull) {
      up.push(point)
      down.push(point)
    } else if (bull) {
      up.push(point)
    } else {
      down.push(point)
    }
  }
  return { up, down, raw }
}
