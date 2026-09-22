import { describe, expect, it } from 'vitest'
import {
  ORDERS_PER_SYMBOL_MAX,
  canAddOrder,
  editPendingOrder,
  createPendingOrder,
  fillFeeRate,
  fillsAt,
  matchPendingOrders,
  parsePendingOrders,
  fillPrice,
  planFills,
  type PendingOrder,
} from '../pending'

const order = (over: Partial<PendingOrder> = {}): PendingOrder => ({
  id: 'o1',
  symbol: 'BTCUSDT',
  side: 'buy',
  price: 60_000,
  qty: 0.5,
  createdAt: 1_000,
  marketable: false,
  ...over,
})

describe('createPendingOrder', () => {
  it('规范化交易对并补齐 id/createdAt', () => {
    const created = createPendingOrder({ symbol: ' btcusdt ', side: 'sell', price: 60000, qty: 0.2, now: 1234 })
    expect(created).not.toBeNull()
    expect(created!.id.startsWith('1234-')).toBe(true)
    expect({ ...created!, id: '' }).toEqual({ id: '', symbol: 'BTCUSDT', side: 'sell', price: 60000, qty: 0.2, createdAt: 1234, marketable: false })
  })

  it('下单时最新价已优于挂单价 → 记为跨价差（Taker）；贴价与无价按未跨计', () => {
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 1, marketPrice: 50_000 })!.marketable).toBe(true)
    // 与最新价持平是「贴价排队」：交易所按 Maker 计，我们只有最新价，按未跨处理
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 1, marketPrice: 60_000 })!.marketable).toBe(false)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 40_000, qty: 1, marketPrice: 50_000 })!.marketable).toBe(false)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'sell', price: 40_000, qty: 1, marketPrice: 50_000 })!.marketable).toBe(true)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'sell', price: 50_000, qty: 1, marketPrice: 50_000 })!.marketable).toBe(false)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'sell', price: 60_000, qty: 1, marketPrice: 50_000 })!.marketable).toBe(false)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 1 })!.marketable).toBe(false)
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 1, marketPrice: null })!.marketable).toBe(false)
  })

  it('非法输入返回 null（空品种/非正价格/非正数量/非有限值/方向非法）', () => {
    expect(createPendingOrder({ symbol: '  ', side: 'buy', price: 1, qty: 1 })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 0, qty: 1 })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: -1, qty: 1 })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: Number.NaN, qty: 1 })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 1, qty: 0 })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'buy', price: 1, qty: Number.POSITIVE_INFINITY })).toBeNull()
    expect(createPendingOrder({ symbol: 'BTCUSDT', side: 'both' as never, price: 1, qty: 1 })).toBeNull()
  })
})

describe('fillsAt', () => {
  it('买单：价格下探到挂单价即成交（含等于）', () => {
    const buy = order({ side: 'buy', price: 60_000 })
    expect(fillsAt(buy, 59_999)).toBe(true)
    expect(fillsAt(buy, 60_000)).toBe(true)
    expect(fillsAt(buy, 60_001)).toBe(false)
  })

  it('卖单：价格上冲到挂单价即成交（含等于）', () => {
    const sell = order({ side: 'sell', price: 60_000 })
    expect(fillsAt(sell, 60_001)).toBe(true)
    expect(fillsAt(sell, 60_000)).toBe(true)
    expect(fillsAt(sell, 59_999)).toBe(false)
  })

  it('价格缺失/非法不成交', () => {
    const buy = order()
    expect(fillsAt(buy, null)).toBe(false)
    expect(fillsAt(buy, undefined)).toBe(false)
    expect(fillsAt(buy, Number.NaN)).toBe(false)
  })
})

describe('matchPendingOrders', () => {
  it('按下单时刻 FIFO 返回成交集合，未触达与无价品种保持挂单', () => {
    const early = order({ id: 'a', createdAt: 1, price: 60_000 })
    const late = order({ id: 'b', createdAt: 2, price: 60_000 })
    const cold = order({ id: 'c', symbol: 'ETHUSDT', createdAt: 3 })
    const notYet = order({ id: 'd', side: 'sell', price: 99_999, createdAt: 4 })
    const prices: Record<string, number> = { BTCUSDT: 59_000 }
    const { filled, resting } = matchPendingOrders([late, notYet, cold, early], (s) => prices[s])
    expect(filled.map((o) => o.id)).toEqual(['a', 'b'])
    expect(resting.map((o) => o.id).sort()).toEqual(['c', 'd'])
  })

  it('同刻多条按 id 稳定排序；空列表安全', () => {
    const a = order({ id: 'aaa', createdAt: 5 })
    const b = order({ id: 'bbb', createdAt: 5 })
    expect(matchPendingOrders([b, a], () => 1).filled.map((o) => o.id)).toEqual(['aaa', 'bbb'])
    expect(matchPendingOrders([], () => 1)).toEqual({ filled: [], resting: [] })
  })
})

describe('parsePendingOrders', () => {
  it('合法条目还原，非法/重复 id/非数组输入丢弃', () => {
    const raw = [
      order({ id: 'x' }),
      order({ id: 'x', price: 1 }),
      { id: 'y', symbol: 'ETHUSDT', side: 'sell', price: '3000', qty: '2', createdAt: 7 },
      { id: '', symbol: 'BTCUSDT', side: 'buy', price: 1, qty: 1 },
      { id: 'z', symbol: 'BTCUSDT', side: 'hold', price: 1, qty: 1 },
      { id: 'w', symbol: 'BTCUSDT', side: 'buy', price: 1, qty: 0 },
    ]
    expect(parsePendingOrders(raw).map((o) => o.id)).toEqual(['x', 'y'])
    expect(parsePendingOrders(raw)[1]).toEqual({ id: 'y', symbol: 'ETHUSDT', side: 'sell', price: 3000, qty: 2, createdAt: 7, marketable: false })
    expect(parsePendingOrders('nope')).toEqual([])
    expect(parsePendingOrders(null)).toEqual([])
  })

  it('存量标记随条目还原：跨价差的单重载后仍是 Taker（重载时无从得知当时最新价）', () => {
    const out = parsePendingOrders([
      { id: 'a', symbol: 'BTCUSDT', side: 'buy', price: 2, qty: 3, createdAt: 5, marketable: true },
      { id: 'b', symbol: 'BTCUSDT', side: 'buy', price: 2, qty: 3, createdAt: 6 },
    ])
    expect(out.map((o) => o.marketable)).toEqual([true, false])
  })

  it('缺失 createdAt 时用当前时间兜底（不产生 NaN 排序键）', () => {
    const out = parsePendingOrders([{ id: 'k', symbol: 'BTCUSDT', side: 'buy', price: 2, qty: 3 }])
    expect(out).toHaveLength(1)
    expect(Number.isFinite(out[0].createdAt)).toBe(true)
  })
})

describe('canAddOrder', () => {
  it('同品种达到上限后拒绝新挂单，其他品种不受影响', () => {
    const many = Array.from({ length: ORDERS_PER_SYMBOL_MAX }, (_, i) => order({ id: `o${i}`, symbol: 'BTCUSDT' }))
    expect(canAddOrder(many, 'btcusdt')).toBe(false)
    expect(canAddOrder(many, 'ETHUSDT')).toBe(true)
    expect(canAddOrder([], 'BTCUSDT')).toBe(true)
  })
})

describe('planFills', () => {
  it('按挂单价计名义金额与挂单费率手续费（Maker 无滑点）', () => {
    const { accepted, rejected } = planFills([order({ price: 100, qty: 2 })], 1_000, () => 0.0005)
    expect(rejected).toEqual([])
    expect(accepted).toEqual([{ order: order({ price: 100, qty: 2 }), notional: 200, fee: 0.1 }])
  })

  it('余额承接不下时按 FIFO 截断：首条不足则其后全部撤销', () => {
    const a = order({ id: 'a', price: 100, qty: 1, createdAt: 1 })
    const b = order({ id: 'b', price: 100, qty: 1, createdAt: 2 })
    const c = order({ id: 'c', price: 100, qty: 1, createdAt: 3 })
    // 余额只够一条（100 + 0.05 费）
    const { accepted, rejected } = planFills([a, b, c], 100.05, () => 0.0005)
    expect(accepted.map((x) => x.order.id)).toEqual(['a'])
    expect(rejected.map((x) => x.id)).toEqual(['b', 'c'])
  })

  it('空列表 / 余额为 0 安全', () => {
    expect(planFills([], 10_000, () => 0.001)).toEqual({ accepted: [], rejected: [] })
    expect(planFills([order()], 0, () => 0.001).rejected).toHaveLength(1)
  })
})

describe('fillPrice 成交价与价格改善', () => {
  it('买单：市场价低于挂单价按市场价成交（跨过价差时不付出更差价）', () => {
    expect(fillPrice(order({ side: 'buy', price: 60_000 }), 50_000)).toBe(50_000)
  })

  it('买单：市场价高于挂单价（挂单尚未触价）按挂单价', () => {
    expect(fillPrice(order({ side: 'buy', price: 60_000 }), 70_000)).toBe(60_000)
  })

  it('卖单镜像：市场价高于挂单价按市场价，低于则按挂单价', () => {
    expect(fillPrice(order({ side: 'sell', price: 60_000 }), 70_000)).toBe(70_000)
    expect(fillPrice(order({ side: 'sell', price: 60_000 }), 50_000)).toBe(60_000)
  })

  it('市场价缺失/非法退回挂单价（撮合判定本身也不会让它成交）', () => {
    expect(fillPrice(order(), null)).toBe(60_000)
    expect(fillPrice(order(), undefined)).toBe(60_000)
    expect(fillPrice(order(), 0)).toBe(60_000)
    expect(fillPrice(order(), NaN)).toBe(60_000)
  })
})

describe('planFills 的成交价入参', () => {
  it('priceOf 提供改善后的市场价：名义额与手续费都按成交价计', () => {
    const o = order({ price: 100, qty: 2 })
    const { accepted } = planFills([o], 1_000, () => 0.0005, () => 90)
    expect(accepted).toEqual([{ order: o, notional: 180, fee: 0.09 }])
  })

  it('余额按成交价口径判定：挂单价会超预算但市场价可承接', () => {
    const o = order({ price: 100, qty: 1 })
    // 挂单价口径需 100 + 0.05 费 → 余额 100.04 承接不下
    expect(planFills([o], 100.04, () => 0.0005).accepted).toHaveLength(0)
    // 市场价 90 口径只需 90 + 0.045 → 同一笔余额即可承接
    expect(planFills([o], 90.05, () => 0.0005, () => 90).accepted).toHaveLength(1)
  })

  it('不传 priceOf 时保持原口径（挂单价即成交价）', () => {
    const o = order({ price: 100, qty: 2 })
    expect(planFills([o], 1_000, () => 0.0005).accepted[0].notional).toBe(200)
  })
})

describe('fillFeeRate 费率归属', () => {
  const rates = { maker: 0.0002, taker: 0.0005 }

  it('挂在盘口等价的挂单按 Maker，下单即跨过价差的按 Taker', () => {
    expect(fillFeeRate(order({ marketable: false }), rates)).toBe(0.0002)
    expect(fillFeeRate(order({ marketable: true }), rates)).toBe(0.0005)
  })
})

describe('planFills 按单取费率', () => {
  it('同一轮里 Maker 与 Taker 各自计费，余额累计也按各自手续费', () => {
    const maker = order({ id: 'm', price: 100, qty: 1, createdAt: 1, marketable: false })
    const taker = order({ id: 't', price: 100, qty: 1, createdAt: 2, marketable: true })
    const { accepted, rejected } = planFills([maker, taker], 1_000, (o) => fillFeeRate(o, { maker: 0.001, taker: 0.01 }), (o) => o.price)
    expect(rejected).toEqual([])
    expect(accepted.map((a) => [a.order.id, a.fee])).toEqual([
      ['m', 0.1],
      ['t', 1],
    ])
  })

  it('Taker 的高费率会计入余额承接判定：Maker 能承接的额度 Taker 未必能', () => {
    const maker = order({ id: 'm', price: 100, qty: 1, marketable: false })
    const taker = order({ id: 't', price: 100, qty: 1, marketable: true })
    const rateOf = (o: PendingOrder) => fillFeeRate(o, { maker: 0.001, taker: 0.01 })
    // 余额 101.05：Maker 一条（100.1）后剩 0.95，Taker 需 101 → 撤销
    expect(planFills([maker, taker], 101.05, rateOf).accepted.map((a) => a.order.id)).toEqual(['m'])
    // 同为 100.1 时 Maker 刚好承接、Taker 承接不下
    expect(planFills([taker], 100.1, rateOf).accepted).toEqual([])
  })
})

describe('editPendingOrder 改价', () => {
  const list = [order({ id: 'a', price: 100, qty: 1 }), order({ id: 'b', side: 'sell', price: 200, qty: 2 })]

  it('只换价格与数量：id/品种/方向/入单时刻与列表顺序不变', () => {
    const next = editPendingOrder(list, 'b', { price: 260, qty: 0.5 })
    expect(next).not.toBeNull()
    expect(next!.map((o) => o.id)).toEqual(['a', 'b'])
    expect(next![1]).toEqual({ id: 'b', symbol: 'BTCUSDT', side: 'sell', price: 260, qty: 0.5, createdAt: 1_000 })
    expect(next![0]).toBe(list[0]) // 未改动的条目保持原引用
  })

  it('订单不存在 → null（不改列表）', () => {
    expect(editPendingOrder(list, 'nope', { price: 1, qty: 1 })).toBeNull()
  })

  it('价格或数量非法 → null：非正、0、NaN、Infinity', () => {
    for (const patch of [{ price: 0, qty: 1 }, { price: -5, qty: 1 }, { price: Number.NaN, qty: 1 }, { price: 100, qty: 0 }, { price: 100, qty: -1 }, { price: 100, qty: Number.POSITIVE_INFINITY }]) {
      expect(editPendingOrder(list, 'a', patch)).toBeNull()
    }
  })
})
