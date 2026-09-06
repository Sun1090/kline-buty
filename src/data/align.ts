import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
/** epoch 后第 4 天是 1970-01-05（周一）；shift 使「t=周一」时 floor 落回本体（见 alignTimeToPeriod 1w 分支） */
const WEEK_MONDAY_SHIFT_MS = 3 * DAY_MS
/** 分页/补洞窗口 1M 用 31 天上界（≥ 任一月长，保证窗口覆盖 ≥count 根） */
const MONTH_SPAN_MS = 31 * DAY_MS

/**
 * K 线时间戳对齐周期边界（A1 openTime 归一化）。
 *
 * 对齐规则与币安公开约定一致：
 * - 整分/整时/整 12h/整日/整 3 日：固定 epoch 倍数（epoch 为 UTC 零点，倍数即整点边界）。
 * - `1w`：**UTC 周一 00:00**（epoch 是周四，固定 7 天倍数会落到周四，需 3 天偏移）。
 * - `1M`：当月 **1 日 00:00 UTC**（月份 28–31 天，不能用固定毫秒倍数）。
 *
 * 币安 REST/WS 返回的 openTime 本身已对齐；合成数据、自定义数据源、旧缓存
 * 可能产生非对齐时间戳，统一经此归一化，保证「同周期时间轴刻度一致、切周期稳定」。
 */
export function alignTimeToPeriod(timeSec: number, period: Period): number {
  const ms = timeSec * 1000
  let alignedMs: number
  if (period === '1w') {
    alignedMs = Math.floor((ms + WEEK_MONDAY_SHIFT_MS) / WEEK_MS) * WEEK_MS - WEEK_MONDAY_SHIFT_MS
  } else if (period === '1M') {
    const d = new Date(ms)
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
    alignedMs = d.getTime()
  } else {
    alignedMs = Math.floor(ms / PERIOD_MS[period]) * PERIOD_MS[period]
  }
  return alignedMs / 1000
}

/**
 * 归一化 K 线数组：逐根对齐到周期边界 → 升序 → 按 time 去重（保留末值）。
 * 数据流统一入口：REST/WS/缓存/补洞/分页/合成数据都经此后再进 MarketStore，
 * 保证任何来源的非对齐/乱序/重复时间戳不污染图表。
 */
export function normalizeCandles(candles: Candle[], period: Period): Candle[] {
  const span = new Map<number, Candle>()
  for (const c of candles) {
    const aligned = alignTimeToPeriod(c.time, period)
    if (aligned === c.time) {
      span.set(c.time, c)
    } else {
      span.set(aligned, { ...c, time: aligned })
    }
  }
  return [...span.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, c]) => c)
}

/**
 * 分页/补洞窗口宽度（ms）：保证按 startTime 向前取 count 根时窗口能覆盖足够周期。
 * `1M` 用 31 天上界（精确月长不固定，31 天 ≥ 任一月，宁宽勿窄防漏页）。
 */
export function periodSpanMs(period: Period, count: number): number {
  return period === '1M' ? count * MONTH_SPAN_MS : count * PERIOD_MS[period]
}