import type { Candle, Period } from '../chart/types'

/**
 * K 线本地缓存（A13：冷启动加速）。
 *
 * 用 localStorage 承载（体积小、同步、无权限问题；K 线数据按品种×周期分键，
 * 单键 800 根 × ~8 字段 ≈ 几十 KB，远在 5MB 配额内，无需 IndexedDB 复杂度）。
 *
 * 语义：
 * - 写入：REST 首次成功拉取后回写整份（含 fetchedAt 时间戳）。
 * - 读取：冷启动先尝试秒开回填；校验通过才采用，损坏/过期即丢弃并返回 null。
 * - 失效：TTL 过期（默认 6 小时）；或序列化校验失败（结构/数量异常）——天然覆盖
 *   周期切换、字段演化等失效场景。
 *
 * 任何异常（隐私模式配额、JSON 损坏）都静默降级为「无缓存」，不影响 REST 主流程。
 */

/** 缓存条目结构（v1） */
interface CacheEntryV1 {
  v: 1
  /** 拉取时间戳（ms），用于 TTL 过期 */
  fetchedAt: number
  candles: Candle[]
}

/** 缓存 TTL：超过视为过期，下次冷启动直接走 REST */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000

/** 结构合法所需最小 K 线数（低于此值视为损坏/空仓写入，丢弃） */
export const MIN_VALID_CANDLES = 2

export function cacheKey(symbol: string, period: Period): string {
  return `kline-cache:${symbol}:${period}`
}

function canUseStorage(): boolean {
  try {
    const k = '__kline_buty_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** 序列化为纯数据（去掉 undefined 字段，压缩体积） */
function serialize(entry: CacheEntryV1): string {
  return JSON.stringify(entry)
}

/** 反序列化 + 结构校验；非法返回 null */
function deserialize(raw: string): CacheEntryV1 | null {
  try {
    const obj = JSON.parse(raw) as Partial<CacheEntryV1>
    if (obj?.v !== 1 || !Array.isArray(obj.candles) || typeof obj.fetchedAt !== 'number') return null
    // 校验每根 K 线的关键字段（顺序/时间/价格数值），防脏数据回填图表
    for (const c of obj.candles) {
      if (
        typeof c !== 'object' || c === null ||
        typeof c.time !== 'number' || !Number.isFinite(c.time) ||
        !Number.isFinite(c.open) || !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) || !Number.isFinite(c.close) ||
        !Number.isFinite(c.volume) ||
        !(c.high >= c.low)
      ) {
        return null
      }
    }
    return obj as CacheEntryV1
  } catch {
    return null
  }
}

/**
 * 读取缓存 K 线：校验通过且未过期返回数组，否则返回 null 并清除坏缓存。
 * nowMs 可注入（测试确定性）。
 */
export function readCachedCandles(symbol: string, period: Period, nowMs = Date.now()): Candle[] | null {
  if (typeof window === 'undefined' || !canUseStorage()) return null
  const raw = window.localStorage.getItem(cacheKey(symbol, period))
  if (raw == null) return null
  const entry = deserialize(raw)
  if (!entry) {
    // 结构损坏：清除坏缓存，避免每次冷启动都重复解析失败
    try {
      window.localStorage.removeItem(cacheKey(symbol, period))
    } catch { /* noop */ }
    return null
  }
  if (entry.candles.length < MIN_VALID_CANDLES) return null
  if (nowMs - entry.fetchedAt > CACHE_TTL_MS) return null
  // 时间戳升序校验（K 线必须有序，图表依赖）
  for (let i = 1; i < entry.candles.length; i++) {
    if (entry.candles[i].time <= entry.candles[i - 1].time) return null
  }
  return entry.candles
}

/** 写入缓存（REST 成功拉取后回写）。任何异常静默降级。 */
export function writeCachedCandles(symbol: string, period: Period, candles: Candle[], nowMs = Date.now()): void {
  if (typeof window === 'undefined' || !canUseStorage() || candles.length < MIN_VALID_CANDLES) return
  try {
    const entry: CacheEntryV1 = { v: 1, fetchedAt: nowMs, candles }
    window.localStorage.setItem(cacheKey(symbol, period), serialize(entry))
  } catch { /* 配额满/隐私模式：忽略 */ }
}
