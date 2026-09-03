import type { Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'

/**
 * G1 K 线时间戳对齐周期边界（openTime 归一化）。
 *
 * 币安 REST 返回的 openTime 本身已是周期边界（整分/整时/整日等），
 * 但合成数据、自定义数据源可能产生非对齐时间戳；统一经此归一化，
 * 保证「同周期时间轴刻度一致、切周期稳定」。
 */
export function alignTimeToPeriod(timeSec: number, period: Period): number {
  const ms = PERIOD_MS[period]
  // 向下取整到周期边界（秒 → 周期毫秒倍数 → 秒）
  return Math.floor(timeSec * 1000 / ms) * ms / 1000
}
