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
  // 默认按「挂在盘口等价」的挂单（Maker）；跨价差的单由用例显式置 true
  marketable: false,
  leverage: null,
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
    takerFeeRate: 0.002,
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

  it('下单即跨价差（marketable）→ 按 Taker 费率记账，成交价仍是改善后的市场价', () => {
    const { recordOpen } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, marketable: true })],
      live: { symbol: 'BTCUSDT', price: 90 },
    })
    expect(recordOpen).toHaveBeenCalledWith({ symbol: 'BTCUSDT', side: 'buy', price: 90, qty: 1, fee: 0.18, feeRate: 0.002 })
  })

  it('同批里挂单价与跨价差单并存：各按自身费率，余额按各自手续费累计承接', () => {
    const maker = order({ id: 'm', createdAt: 1, side: 'buy', price: 100, qty: 1 })
    const taker = order({ id: 't', createdAt: 2, side: 'buy', price: 100, qty: 1, marketable: true })
    // 市场价 90：Maker 90+0.045、Taker 90+0.18 → 余额 180.2 只够一条
    const { recordOpen } = setup({ orders: [maker, taker], live: { symbol: 'BTCUSDT', price: 90 }, balance: 180.2 })
    expect(recordOpen.mock.calls.map((c) => c[0].feeRate)).toEqual([0.0005])
    expect(recordOpen.mock.calls.map((c) => c[0].symbol)).toEqual(['BTCUSDT'])
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
  it('随单止盈/止损落到新开仓位上，取代百分比参考价', () => {
    const { setPositionsBySymbol } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, takeProfit: 130, stopLoss: 88 })],
      live: { symbol: 'BTCUSDT', price: 100 },
    })
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    const next = updater({ BTCUSDT: EMPTY_POSITIONS })
    expect({ takeProfit: next.BTCUSDT.long!.takeProfit, stopLoss: next.BTCUSDT.long!.stopLoss }).toEqual({ takeProfit: 130, stopLoss: 88 })
  })

  it('成交价优于挂单价时复检随单价位：站错一侧的那条不写进持仓', () => {
    // 买单挂 100、市场 95 更优 → 以 95 成交；止损 98 已在开仓价之上，写了就是「成交即触发」
    // 摘掉后那条回到按成交价算的参考止损（2% → 93.1），止盈 120 仍成立照带
    const { setPositionsBySymbol } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, takeProfit: 120, stopLoss: 98 })],
      live: { symbol: 'BTCUSDT', price: 95 },
    })
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    const next = updater({ BTCUSDT: EMPTY_POSITIONS })
    expect({ takeProfit: next.BTCUSDT.long!.takeProfit, stopLoss: next.BTCUSDT.long!.stopLoss }).toEqual({ takeProfit: 120, stopLoss: 93.1 })
  })

  it('成交并入了既有持仓 → 既有止盈/止损线不被随单价位覆盖', () => {
    const held: Positions = { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 130, stopLoss: 118 }, short: null }
    const { setPositionsBySymbol } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, takeProfit: 999, stopLoss: 1 })],
      live: { symbol: 'BTCUSDT', price: 100 },
    })
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    const next = updater({ BTCUSDT: held })
    expect({ takeProfit: next.BTCUSDT.long!.takeProfit, stopLoss: next.BTCUSDT.long!.stopLoss }).toEqual({ takeProfit: 130, stopLoss: 118 })
  })

  it('成交把随单杠杆写进新开仓位；并入既有持仓时沿用既有杠杆', () => {
    const { setPositionsBySymbol } = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, leverage: 20 })],
      live: { symbol: 'BTCUSDT', price: 100 },
    })
    const updater = setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    expect(updater({ BTCUSDT: EMPTY_POSITIONS }).BTCUSDT.long!.leverage).toBe(20)

    const held: Positions = { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 130, stopLoss: 118, leverage: 5 }, short: null }
    const again = setup({
      orders: [order({ side: 'buy', price: 100, qty: 1, leverage: 100 })],
      live: { symbol: 'BTCUSDT', price: 100 },
    })
    const second = again.setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol
    expect(second({ BTCUSDT: held }).BTCUSDT.long!.leverage).toBe(5)
  })

})
