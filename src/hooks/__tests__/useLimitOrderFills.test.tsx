// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useLimitOrderFills } from '../useLimitOrderFills'
import type { PendingOrder } from '../../trade/pending'
import { EMPTY_POSITIONS, type Positions } from '../../trade/positions'

type PositionsBySymbol = Record<string, Positions>

const order = (over: Partial<PendingOrder> = {}): PendingOrder => ({
  id: 'a',
  symbol: 'BTCUSDT',
  side: 'buy',
  price: 100,
  qty: 1,
  createdAt: 1,
  ...over,
})

function setup(over: Partial<Parameters<typeof useLimitOrderFills>[0]> = {}) {
  const remove = vi.fn()
  const recordOpen = vi.fn()
  const setPositionsBySymbol = vi.fn()
  const onNotice = vi.fn()
  const base: Parameters<typeof useLimitOrderFills>[0] = {
    orders: [],
    remove,
    balance: 10_000,
    recordOpen,
    setPositionsBySymbol,
    makerFeeRate: 0.0005,
    live: { symbol: 'BTCUSDT', price: 500 },
    prices: {},
    onNotice,
  }
  const utils = renderHook(() => useLimitOrderFills({ ...base, ...over }))
  return { ...utils, remove, recordOpen, setPositionsBySymbol, onNotice }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('useLimitOrderFills', () => {
  it('无挂单时不撮合', () => {
    const { recordOpen, onNotice } = setup({ orders: [] })
    expect(recordOpen).not.toHaveBeenCalled()
    expect(onNotice).not.toHaveBeenCalled()
  })

  it('价格未触达 → 保持挂单，不记账', () => {
    const { remove, recordOpen, onNotice } = setup({ orders: [order({ side: 'buy', price: 90 })], live: { symbol: 'BTCUSDT', price: 91 } })
    expect(remove).not.toHaveBeenCalled()
    expect(recordOpen).not.toHaveBeenCalled()
    expect(onNotice).not.toHaveBeenCalled()
  })

  it('触价成交：市场价更优按市场价成交、按挂单费率记账、hedge 合并持仓、移出列表并提示', () => {
    const { remove, recordOpen, setPositionsBySymbol, onNotice } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 2 })],
      live: { symbol: 'BTCUSDT', price: 99 },
    })
    expect(remove).toHaveBeenCalledWith(['a'])
    // 买单价 100 而市场仅 99 → 价格改善按 99 成交（不会为同一笔行情多付）
    expect(recordOpen).toHaveBeenCalledWith({ symbol: 'BTCUSDT', side: 'buy', price: 99, qty: 2, fee: 0.099, feeRate: 0.0005 })
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    const next = updater({})
    expect(next.BTCUSDT.long).toEqual(expect.objectContaining({ entry: 99, quantity: 2, direction: 'long' }))
    expect(next.BTCUSDT.short).toBeNull()
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ kind: 'filled', symbol: 'BTCUSDT', price: 99 }))
  })

  it('市场价劣于挂单价时仍以挂单价成交（挂单被动触价）', () => {
    const { recordOpen } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1 })],
      live: { symbol: 'BTCUSDT', price: 100 },
    })
    expect(recordOpen).toHaveBeenCalledWith(expect.objectContaining({ price: 100, fee: 0.05 }))
  })

  it('非当前品种走轮询价表；无价品种保持挂单', () => {
    const eth = order({ id: 'eth', symbol: 'ETHUSDT', side: 'sell', price: 3_000 })
    const sol = order({ id: 'sol', symbol: 'SOLUSDT', price: 120 })
    const { recordOpen, remove } = setup({ orders: [eth, sol], live: null, prices: { ETHUSDT: 3001 } })
    expect(remove).toHaveBeenCalledWith(['eth'])
    expect(recordOpen).toHaveBeenCalledTimes(1)
    // 卖单挂 3000、市场已 3001 → 按更优的 3001 成交
    expect(recordOpen).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'ETHUSDT', side: 'sell', price: 3_001 }))
  })

  it('余额承接不下 → 撤销并提示，不开仓', () => {
    const { recordOpen, remove, onNotice } = setup({
      orders: [order({ price: 1_000, qty: 1 })],
      live: { symbol: 'BTCUSDT', price: 900 },
      balance: 100,
    })
    expect(recordOpen).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(['a'])
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ kind: 'cancelled', symbol: 'BTCUSDT' }))
  })

  it('同批多条按 FIFO 记账，成交数量累加到同一 hedge 槽', () => {
    const a = order({ id: 'a', createdAt: 1, price: 100, qty: 1 })
    const b = order({ id: 'b', createdAt: 2, price: 100, qty: 2 })
    const { recordOpen, setPositionsBySymbol } = setup({ orders: [b, a], live: { symbol: 'BTCUSDT', price: 80 } })
    expect(recordOpen.mock.calls.map((c) => c[0].qty)).toEqual([1, 2])
    // 两条都按改善价 80 成交
    expect(recordOpen.mock.calls.map((c) => c[0].price)).toEqual([80, 80])
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    const afterFirst = updater({ BTCUSDT: EMPTY_POSITIONS })
    const second = setPositionsBySymbol.mock.calls[1][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    expect(second(afterFirst).BTCUSDT.long).toEqual(expect.objectContaining({ entry: 80, quantity: 3 }))
  })

  it('幂等：同一批挂单重复渲染不会二次记账', () => {
    const orders = [order({ price: 100 })]
    const { recordOpen, rerender } = setup({ orders, live: { symbol: 'BTCUSDT', price: 80 } })
    expect(recordOpen).toHaveBeenCalledTimes(1)
    // remove 未真正移除（模拟 deps 抖动 / StrictMode 双跑）：同一订单再次进入 effect
    rerender()
    rerender()
    expect(recordOpen).toHaveBeenCalledTimes(1)
  })
})
