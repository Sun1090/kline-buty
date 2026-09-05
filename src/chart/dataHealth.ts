import type { Candle, Period } from './types'
import { PERIOD_MS } from './types'

/** G6 一段数据缺口（毫秒区间） */
export interface GapRange {
  /** 缺口起点（前一收盘 K 线的时间，秒） */
  gapStart: number
  /** 缺口终点（后一开盘 K 线的时间，秒） */
  gapEnd: number
  /** 缺口长度（秒） */
  lengthSec: number
}

/**
 * G6 数据健康度：检测 K 线序列中的缺口区间。
 *
 * 相邻两根时间差 > 周期时长 × tolerance（默认 1.5，容忍微小的跨周/异动偏移）
 * 即判定为缺口。返回缺口列表（升序）；无缺口返回 []。
 */
export function findGaps(candles: Candle[], period: Period, tolerance = 1.5): GapRange[] {
  if (candles.length < 2) return []
  const periodSec = PERIOD_MS[period] / 1000
  const out: GapRange[] = []
  for (let i = 1; i < candles.length; i++) {
    const d = candles[i].time - candles[i - 1].time
    if (d > periodSec * tolerance) {
      out.push({ gapStart: candles[i - 1].time, gapEnd: candles[i].time, lengthSec: d })
    }
  }
  return out
}

/** G6 健康度档位：0 缺口 → healthy；1-2 → partial；≥3 → degraded */
export type GapHealth = 'healthy' | 'partial' | 'degraded'

/** G6 汇总缺口列表为健康度档位（0/1-2/≥3 分级） */
export function gapHealth(gaps: GapRange[]): GapHealth {
  if (gaps.length === 0) return 'healthy'
  if (gaps.length <= 2) return 'partial'
  return 'degraded'
}
