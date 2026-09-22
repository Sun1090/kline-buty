import type { OrderSide } from './order'

/**
 * 限价挂单领域模型：触价即成交、不计滑点；市场价已优于挂单价时按市场价成交
 * （价格改善，见 `fillPrice`）。挂在盘口等价的限价单按 Maker 费率计费，
 * 而下单即跨过价差的（marketable limit）吃穿盘口，交易所按 Taker 计费。
 * 撮合判定放在纯函数层，余额与持仓落地由调用方（App 撮合循环）处理。
 */
export interface PendingOrder {
  id: string
  symbol: string
  side: OrderSide
  /** 触发价（限价下界；市场价更优时以市场价为成交价） */
  price: number
  qty: number
  /** 下单时刻（ms）：同价多条时按此 FIFO 撮合 */
  createdAt: number
  /** 下单时的最新价已优于挂单价 → 这单从提交那一刻就在吃单（Taker） */
  marketable: boolean
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
  /** 下单时的最新价：用于判定是否即刻跨价差；缺价（未连上行情的品种）按未跨计 */
  marketPrice?: number | null
}

/** 同一交易对最多挂单数（防止误点堆出长列表） */
export const ORDERS_PER_SYMBOL_MAX = 10

const idSuffix = () => Math.random().toString(36).slice(2, 8)

/**
 * 是否已跨过价差：买价高于最新价、卖价低于最新价（价缺时按未跨计）。
 * 取严格不等号：与最新价相等的挂单是「贴价排队」，交易所按 Maker 计——我们只有最新价
 * （没有买卖一），按贴价处理更贴近用户点「买」时的意图。
 */
export function isMarketable(order: { side: OrderSide; price: number }, market: number | null | undefined): boolean {
  if (typeof market !== 'number' || !Number.isFinite(market) || market <= 0) return false
  return order.side === 'buy' ? order.price > market : order.price < market
}

/** 创建挂单：交易对为空、价格/数量非正或非有限值 → null（调用方拦截，不产生脏数据） */
export function createPendingOrder(input: PendingOrderInput): PendingOrder | null {
  const symbol = (input.symbol ?? '').trim().toUpperCase()
  const { price, qty, side } = input
  if (!symbol) return null
  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(qty) || qty <= 0) return null
  if (side !== 'buy' && side !== 'sell') return null
  const now = input.now ?? Date.now()
  return {
    id: input.id ?? `${now}-${idSuffix()}`,
    symbol,
    side,
    price,
    qty,
    createdAt: now,
    marketable: isMarketable({ side, price }, input.marketPrice),
  }
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
    // 费率归属以入单当时的判定为准：重载入库时已无从得知当时最新价，只认存量标记
    order.marketable = d.marketable === true
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

export interface PendingOrderPatch {
  price: number
  qty: number
}

/**
 * 改价：只换挂单价与数量，id / 品种 / 方向 / 入单时刻保持不变（同价多条的 FIFO 顺位不因改价而变）。
 * 订单不存在、价格或数量非正/非有限 → null，由调用方提示而不是静默丢单。
 */
export function editPendingOrder(
  orders: PendingOrder[],
  id: string,
  patch: PendingOrderPatch,
): PendingOrder[] | null {
  const idx = orders.findIndex((o) => o.id === id)
  if (idx < 0) return null
  const { price, qty } = patch
  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(qty) || qty <= 0) return null
  const next = [...orders]
  next[idx] = { ...orders[idx], price, qty }
  return next
}

/** 成交价：市场价优于挂单价时按市场价成交（价格改善），市场价缺失时退回挂单价 */
export function fillPrice(order: PendingOrder, market: number | null | undefined): number {
  if (typeof market !== 'number' || !Number.isFinite(market) || market <= 0) return order.price
  return order.side === 'buy' ? Math.min(order.price, market) : Math.max(order.price, market)
}

/** 成交费率：挂在盘口等触价成交的挂单按 Maker；下单即跨过价差的吃单按 Taker */
export function fillFeeRate(order: PendingOrder, rates: { maker: number; taker: number }): number {
  return order.marketable ? rates.taker : rates.maker
}

export interface FillPlanItem {
  order: PendingOrder
  /** 名义金额 = 成交价 × 数量（限价单无滑点） */
  notional: number
  /** 按该单费率计的手续费 */
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
 * `priceOf` 给出该订单的实际成交价（默认挂单价），名义金额与费用按成交价计；
 * `feeRateOf` 给出该订单的费率（Maker / Taker 由挂单是否跨价差决定）。
 */
export function planFills(
  filled: PendingOrder[],
  balance: number,
  feeRateOf: (order: PendingOrder) => number,
  priceOf: (order: PendingOrder) => number = (order) => order.price,
): FillPlan {
  const accepted: FillPlanItem[] = []
  const rejected: PendingOrder[] = []
  let used = 0
  for (let i = 0; i < filled.length; i++) {
    const order = filled[i]
    const notional = priceOf(order) * order.qty
    const fee = notional * feeRateOf(order)
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
