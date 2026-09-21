import { describe, expect, it } from 'vitest'
import {
  ORDERS_PER_SYMBOL_MAX,
  canAddOrder,
  createPendingOrder,
  fillsAt,
  matchPendingOrders,
  parsePendingOrders,
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
  ...over,
})

describe('createPendingOrder', () => {
  it('规范化交易对并补齐 id/createdAt', () => {
    const created = createPendingOrder({ symbol: ' btcusdt ', side: 'sell', price: 60000, qty: 0.2, now: 1234 })
    expect(created).not.toBeNull()
    expect(created!.id.startsWith('1234-')).toBe(true)
    expect({ ...created!, id: '' }).toEqual({ id: '', symbol: 'BTCUSDT', side: 'sell', price: 60000, qty: 0.2, createdAt: 1234 })
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
    expect(parsePendingOrders(raw)[1]).toEqual({ id: 'y', symbol: 'ETHUSDT', side: 'sell', price: 3000, qty: 2, createdAt: 7 })
    expect(parsePendingOrders('nope')).toEqual([])
    expect(parsePendingOrders(null)).toEqual([])
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
    const { accepted, rejected } = planFills([order({ price: 100, qty: 2 })], 1_000, 0.0005)
    expect(rejected).toEqual([])
    expect(accepted).toEqual([{ order: order({ price: 100, qty: 2 }), notional: 200, fee: 0.1 }])
  })

  it('余额承接不下时按 FIFO 截断：首条不足则其后全部撤销', () => {
    const a = order({ id: 'a', price: 100, qty: 1, createdAt: 1 })
    const b = order({ id: 'b', price: 100, qty: 1, createdAt: 2 })
    const c = order({ id: 'c', price: 100, qty: 1, createdAt: 3 })
    // 余额只够一条（100 + 0.05 费）
    const { accepted, rejected } = planFills([a, b, c], 100.05, 0.0005)
    expect(accepted.map((x) => x.order.id)).toEqual(['a'])
    expect(rejected.map((x) => x.id)).toEqual(['b', 'c'])
  })

  it('空列表 / 余额为 0 安全', () => {
    expect(planFills([], 10_000, 0.001)).toEqual({ accepted: [], rejected: [] })
    expect(planFills([order()], 0, 0.001).rejected).toHaveLength(1)
  })
})
