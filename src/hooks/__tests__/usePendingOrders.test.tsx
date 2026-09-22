// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PENDING_MAX, usePendingOrders } from '../usePendingOrders'
import { ORDERS_PER_SYMBOL_MAX, type PendingOrder } from '../../trade/pending'

const KEY = 'kline-buty:paperOrders'

const order = (id: string, over: Partial<PendingOrder> = {}): PendingOrder => ({
  id,
  symbol: 'BTCUSDT',
  side: 'buy',
  price: 100,
  qty: 1,
  createdAt: 1,
  marketable: false,
  ...over,
})

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('usePendingOrders', () => {
  it('新增挂单写入列表并持久化（读取即还原）', () => {
    const { result } = renderHook(() => usePendingOrders())
    expect(result.current.orders).toEqual([])

    act(() => result.current.add(order('a')))
    expect(result.current.orders.map((o) => o.id)).toEqual(['a'])
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toHaveLength(1)

    const again = renderHook(() => usePendingOrders())
    expect(again.result.current.orders.map((o) => o.id)).toEqual(['a'])
  })

  it('同品种超过上限后 add 返回 false 且列表不变', () => {
    localStorage.setItem(KEY, JSON.stringify(Array.from({ length: ORDERS_PER_SYMBOL_MAX }, (_, i) => order(`o${i}`))))
    const { result } = renderHook(() => usePendingOrders())
    expect(result.current.canAdd('BTCUSDT')).toBe(false)
    expect(result.current.canAdd('ETHUSDT')).toBe(true)
    expect(result.current.add(order('extra'))).toBe(false)
    expect(result.current.orders).toHaveLength(ORDERS_PER_SYMBOL_MAX)
  })

  it('全局条数上限：超出后丢弃最旧挂单', () => {
    const { result } = renderHook(() => usePendingOrders())
    act(() => {
      for (let i = 0; i < PENDING_MAX + 5; i++) result.current.add(order(`x${i}`, { symbol: `SYM${i}USDT` }))
    })
    expect(result.current.orders).toHaveLength(PENDING_MAX)
    expect(result.current.orders.some((o) => o.id === 'x0')).toBe(false)
    expect(result.current.orders[result.current.orders.length - 1].id).toBe(`x${PENDING_MAX + 4}`)
  })

  it('按 id 批量移除；空 id 列表不产生写入', () => {
    localStorage.setItem(KEY, JSON.stringify([order('a'), order('b'), order('c', { symbol: 'ETHUSDT' })]))
    const { result } = renderHook(() => usePendingOrders())

    act(() => result.current.remove([]))
    expect(result.current.orders).toHaveLength(3)

    act(() => result.current.remove(['a', 'c']))
    expect(result.current.orders.map((o) => o.id)).toEqual(['b'])
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toHaveLength(1)
  })

  it('edit 改价：列表与存储同步，只动价格与数量', () => {
    localStorage.setItem(KEY, JSON.stringify([order('a', { price: 100, qty: 1 }), order('b', { price: 200, qty: 2 })]))
    const { result } = renderHook(() => usePendingOrders())
    let ok = false
    act(() => {
      ok = result.current.edit('b', { price: 260, qty: 0.5 })
    })
    expect(ok).toBe(true)
    expect(result.current.orders.map((o) => [o.id, o.price, o.qty])).toEqual([
      ['a', 100, 1],
      ['b', 260, 0.5],
    ])
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toEqual(result.current.orders)
  })

  it('edit 非法或订单不存在 → false 且列表不动', () => {
    localStorage.setItem(KEY, JSON.stringify([order('a', { price: 100, qty: 1 })]))
    const { result } = renderHook(() => usePendingOrders())
    act(() => {
      expect(result.current.edit('a', { price: 0, qty: 1 })).toBe(false)
      expect(result.current.edit('ghost', { price: 120, qty: 1 })).toBe(false)
    })
    expect(result.current.orders.map((o) => [o.price, o.qty])).toEqual([[100, 1]])
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toHaveLength(1)
  })

  it('clear 清空列表与存储', () => {
    localStorage.setItem(KEY, JSON.stringify([order('a')]))
    const { result } = renderHook(() => usePendingOrders())
    act(() => result.current.clear())
    expect(result.current.orders).toEqual([])
    expect(localStorage.getItem(KEY)).toBe('[]')
  })

  it('存储损坏或含脏数据时读取即清洗（不抛、不产生 NaN 挂单）', () => {
    localStorage.setItem(KEY, '{not json')
    expect(renderHook(() => usePendingOrders()).result.current.orders).toEqual([])

    localStorage.setItem(KEY, JSON.stringify([order('ok'), { id: 'bad', symbol: '', side: 'buy', price: 0, qty: 1 }]))
    const { result } = renderHook(() => usePendingOrders())
    expect(result.current.orders.map((o) => o.id)).toEqual(['ok'])
  })
})
