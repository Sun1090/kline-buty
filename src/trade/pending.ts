import type { OrderSide } from './order'

/**
 * 限价挂单（Maker 单）领域模型：挂单价即成交价，触达即成交、不计滑点。
 * 撮合判定放在纯函数层，余额与持仓落地由调用方（App 撮合循环）处理。
 */
export interface PendingOrder {
  id: string
  symbol: string
  side: OrderSide
  /** 触发价（同时是成交价） */
  price: number
  qty: number
  /** 下单时刻（ms）：同价多条时按此 FIFO 撮合 */
  createdAt: number
}

export interface PendingOrderInput {
  symbol: string
  side: OrderSide
  price: number
  qty: number
  /** 下单时刻（ms），默认取当前时间（测试传入固定值） */
  now?: number
  /** 订单 id（默认时间戳 + 随机后缀） */
  id?: string
}

/** 同一交易对最多挂单数（防止误点堆出长列表） */
export const ORDERS_PER_SYMBOL_MAX = 10

const idSuffix = () => Math.random().toString(36).slice(2, 8)

/** 创建挂单：交易对为空、价格/数量非正或非有限值 → null（调用方拦截，不产生脏数据） */
export function createPendingOrder(input: PendingOrderInput): PendingOrder | null {
  const symbol = (input.symbol ?? '').trim().toUpperCase()
  const { price, qty, side } = input
  if (!symbol) return null
  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(qty) || qty <= 0) return null
  if (side !== 'buy' && side !== 'sell') return null
  const now = input.now ?? Date.now()
  return { id: input.id ?? `${now}-${idSuffix()}`, symbol, side, price, qty, createdAt: now }
}

/** 单条撮合判定：买单价 ≤ 触发、卖单价 ≥ 触发（价格缺失/非法永不成交） */
export function fillsAt(order: PendingOrder, price: number | null | undefined): boolean {
  if (typeof price !== 'number' || !Number.isFinite(price)) return false
  return order.side === 'buy' ? price <= order.price : price >= order.price
}

export interface PendingMatchResult {
  /** 本轮应成交的挂单（FIFO 顺序） */
  filled: PendingOrder[]
  /** 继续挂着的订单（含价格未知的品种） */
  resting: PendingOrder[]
}

/**
 * 扫描撮合：`priceFor` 提供各品种最新价（无价的品种保持挂单）。
 * filled 按下单时刻升序（同刻按 id 稳定），两个集合互斥且覆盖入参。
 */
export function matchPendingOrders(
  orders: PendingOrder[],
  priceFor: (symbol: string) => number | null | undefined,
): PendingMatchResult {
  const filled: PendingOrder[] = []
  const resting: PendingOrder[] = []
  const ordered = [...orders].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
  for (const order of ordered) {
    if (fillsAt(order, priceFor(order.symbol))) filled.push(order)
    else resting.push(order)
  }
  return { filled, resting }
}

/** 持久化/导入反序列化：逐条校验，非法条目与重复 id 丢弃（保持原顺序） */
export function parsePendingOrders(raw: unknown): PendingOrder[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: PendingOrder[] = []
  for (const item of raw) {
    const d = item as Partial<PendingOrder>
    if (typeof d.id !== 'string' || !d.id || seen.has(d.id)) continue
    const order = createPendingOrder({
      symbol: typeof d.symbol === 'string' ? d.symbol : '',
      side: d.side as OrderSide,
      price: Number(d.price),
      qty: Number(d.qty),
      now: Number.isFinite(Number(d.createdAt)) ? Number(d.createdAt) : Date.now(),
      id: d.id,
    })
    if (!order) continue
    seen.add(order.id)
    out.push(order)
  }
  return out
}

/** 是否还能接受该品种的新挂单（同品种上限） */
export function canAddOrder(orders: PendingOrder[], symbol: string): boolean {
  const target = symbol.trim().toUpperCase()
  return orders.filter((o) => o.symbol === target).length < ORDERS_PER_SYMBOL_MAX
}

export interface FillPlanItem {
  order: PendingOrder
  /** 名义金额 = 挂单价 × 数量（Maker 单无滑点） */
  notional: number
  /** 挂单费率计的手续费 */
  fee: number
}

export interface FillPlan {
  accepted: FillPlanItem[]
  /** 余额不足以承接的订单（撤销并提示） */
  rejected: PendingOrder[]
}

/**
 * 撮合落地计划：按 FIFO 顺序累计名义金额 + 手续费，超出可用余额的挂单不成交。
 * 同一轮多条成交必须累计判定——开仓只即时扣手续费，余额不会随开仓递减。
 */
export function planFills(filled: PendingOrder[], balance: number, feeRate: number): FillPlan {
  const accepted: FillPlanItem[] = []
  const rejected: PendingOrder[] = []
  let used = 0
  for (let i = 0; i < filled.length; i++) {
    const order = filled[i]
    const notional = order.price * order.qty
    const fee = notional * feeRate
    // FIFO：一旦承接不下，后续订单全部撤销（不插队成交）
    if (used + notional + fee > balance) {
      rejected.push(...filled.slice(i))
      break
    }
    used += notional + fee
    accepted.push({ order, notional, fee })
  }
  return { accepted, rejected }
}
