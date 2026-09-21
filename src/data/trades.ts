/**
 * 逐笔成交（成交 Tape）：现货 /api/v3/trades 与 USDT-M /fapi/v1/trades 返回结构同构，
 * 这里承载领域类型与「多页轮询合并」纯函数。
 */
export interface TradePrint {
  /** 成交 id（币安内单调递增，作为去重键） */
  id: number
  price: number
  qty: number
  /** 成交时间（毫秒） */
  time: number
  /** 主动买（买方吃单，即 isBuyerMaker = false） */
  buy: boolean
}

/** 原始逐笔成交 → 领域类型：字段缺失/非法的条目直接丢弃，避免 NaN 行进入列表 */
export function parseTrades(raw: unknown[]): TradePrint[] {
  const out: TradePrint[] = []
  for (const item of raw) {
    const d = item as { id?: unknown; price?: unknown; qty?: unknown; time?: unknown; isBuyerMaker?: unknown }
    const id = Number(d.id)
    const price = Number(d.price)
    const qty = Number(d.qty)
    const time = Number(d.time)
    if (![id, price, qty, time].every(Number.isFinite)) continue
    out.push({ id, price, qty, time, buy: d.isBuyerMaker !== true })
  }
  return out
}

/** Tape 最多保留的成交笔数（超出丢弃最旧） */
export const TAPE_CAP = 60

/**
 * 合并新一页成交：按 id 去重、按 (time, id) 升序、尾部保留最新 TAPE_CAP 条。
 * 相邻两轮轮询返回的页必然重叠，无新成交时返回原引用，避免定时重渲染。
 */
export function mergeTrades(prev: TradePrint[], incoming: TradePrint[], cap = TAPE_CAP): TradePrint[] {
  if (incoming.length === 0) return prev
  const byId = new Map<number, TradePrint>()
  for (const t of prev) byId.set(t.id, t)
  let added = false
  for (const t of incoming) {
    if (byId.has(t.id)) continue
    byId.set(t.id, t)
    added = true
  }
  if (!added) return prev
  const all = [...byId.values()].sort((a, b) => a.time - b.time || a.id - b.id)
  return all.length > cap ? all.slice(all.length - cap) : all
}

/** 成交时刻 HH:MM:SS（本地时区） */
export function fmtTradeClock(time: number): string {
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
