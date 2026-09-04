import type { Candle } from '../chart/types'
import type { IndicatorParams } from './params'
import type { ValuePoint } from './sma'
import { calcRSI } from './rsi'
import { calcMACD } from './macd'
import { calcKDJ } from './kdj'
import { calcATR } from './extras'
import { calcMFI } from './mfi'
import { calcTRIX } from './trix'
import { calcDPO } from './dpo'
import { calcVortex } from './vortex'
import { calcAO } from './ao'
import { calcCMF } from './cmf'
import { calcDonchian } from './donchian'
import { calcAroon } from './aroon'

/**
 * H13 副图指标线计算（worker 可序列化版本）。
 *
 * 输入 Candle[] + 指标参数，输出各副图指标的线点集（不含主题色/markers/zones——
 * 颜色类渲染态留在主线程按 theme 处理，worker 只算数值，保证两端一致、可缓存）。
 *
 * 专为 Web Worker 设计：所有 calc 均为纯函数、入参可结构化克隆。
 * 返回 null 表示该指标不以「线集」形态工作（volume/macd 的 hist 分支、bbw 等）。
 */
export function workerSubLines(
  kind: string,
  candles: Candle[],
  params: IndicatorParams,
): { id: string; points: ValuePoint[] }[] | null {
  switch (kind) {
    case 'rsi':
      return [{ id: 'RSI', points: calcRSI(candles, params.rsiPeriod) }]
    case 'macd': {
      const macd = calcMACD(candles, params.macdFast, params.macdSlow, params.macdSignal)
      return [
        { id: 'DIF', points: macd.map((p) => ({ time: p.time, value: p.dif })) },
        { id: 'DEA', points: macd.map((p) => ({ time: p.time, value: p.dea })) },
      ]
    }
    case 'kdj': {
      const kdj = calcKDJ(candles, params.kdjN, params.kdjM1, params.kdjM2)
      return [
        { id: 'K', points: kdj.map((p) => ({ time: p.time, value: p.k })) },
        { id: 'D', points: kdj.map((p) => ({ time: p.time, value: p.d })) },
        { id: 'J', points: kdj.map((p) => ({ time: p.time, value: p.j })) },
      ]
    }
    case 'atr':
      return [{ id: 'ATR', points: calcATR(candles, params.atrPeriod) }]
    case 'mfi':
      return [{ id: 'MFI', points: calcMFI(candles, params.mfiPeriod) }]
    case 'trix':
      return [{ id: 'TRIX', points: calcTRIX(candles, params.trixPeriod) }]
    case 'dpo':
      return [{ id: 'DPO', points: calcDPO(candles, params.dpoPeriod) }]
    case 'vortex': {
      const v = calcVortex(candles, params.vortexPeriod)
      return [
        { id: 'VI+', points: v.plus },
        { id: 'VI-', points: v.minus },
      ]
    }
    case 'ao': {
      const ao = calcAO(candles, params.aoFast, params.aoSlow)
      return [{ id: 'AO', points: ao }]
    }
    case 'cmf':
      return [{ id: 'CMF', points: calcCMF(candles, params.cmfPeriod) }]
    case 'donchian': {
      const dc = calcDonchian(candles, params.donchianPeriod)
      return [
        { id: 'DC-U', points: dc.map((p) => ({ time: p.time, value: p.upper })) },
        { id: 'DC-L', points: dc.map((p) => ({ time: p.time, value: p.lower })) },
        { id: 'DC-BC', points: dc.map((p) => ({ time: p.time, value: p.middle })) },
      ]
    }
    case 'aroon': {
      const aroon = calcAroon(candles, params.aroonPeriod)
      return [
        { id: 'A-U', points: aroon.map((p) => ({ time: p.time, value: p.up })) },
        { id: 'A-D', points: aroon.map((p) => ({ time: p.time, value: p.down })) },
      ]
    }
    default:
      return null
  }
}

/** H13 worker 消息协议（主线程 → worker） */
export interface WorkerLineRequest {
  id: number
  kind: string
  candles: Candle[]
  params: IndicatorParams
}

/** H13 worker 消息协议（worker → 主线程） */
export interface WorkerLineResponse {
  id: number
  lines: { id: string; points: ValuePoint[] }[] | null
  error?: string
}
