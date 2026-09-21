// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { usePositionSettlement } from '../usePositionSettlement'
import { EMPTY_POSITIONS, type Positions } from '../../trade/positions'
import type { Position } from '../../position/pnl'

type PositionsBySymbol = Record<string, Positions>

const longPos = (over: Partial<Position> = {}): Position => ({
  entry: 100,
  quantity: 1,
  direction: 'long',
  takeProfit: 120,
  stopLoss: 90,
  ...over,
})
const shortPos = (over: Partial<Position> = {}): Position => ({
  entry: 100,
  quantity: 1,
  direction: 'short',
  takeProfit: 80,
  stopLoss: 110,
  ...over,
})

function setup(over: Partial<Parameters<typeof usePositionSettlement>[0]> = {}) {
  const recordClose = vi.fn()
  const setPositionsBySymbol = vi.fn()
  const onExit = vi.fn()
  const autoSettled = new WeakSet<Position>()
  const base: Parameters<typeof usePositionSettlement>[0] = {
    positionsBySymbol: {},
    live: null,
    prices: {},
    takerFeeRate: 0.001,
    recordClose,
    setPositionsBySymbol,
    autoSettled,
    onExit,
  }
  const utils = renderHook(() => usePositionSettlement({ ...base, ...over }))
  return { ...utils, recordClose, setPositionsBySymbol, onExit, autoSettled }
}

afterEach(cleanup)

describe('usePositionSettlement 止盈止损结算循环', () => {
  it('其他品种触止损：按轮询价结算、清空槽位并回调', () => {
    const held: Position = longPos()
    const { recordClose, setPositionsBySymbol, onExit } = setup({
      positionsBySymbol: { ETHUSDT: { long: held, short: null } },
      prices: { ETHUSDT: 88 },
    })
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(recordClose).toHaveBeenCalledWith({
      symbol: 'ETHUSDT',
      // 平仓流水 side 记被平掉的方向：平多记 buy
      side: 'buy',
      price: 88,
      qty: 1,
      // 开仓名义额 100 × 0.1% = 0.1
      fee: 0.1,
      feeRate: 0.001,
      pnl: -12,
    })
    const next = (setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol)({
      ETHUSDT: { long: held, short: null },
    })
    expect(next.ETHUSDT).toEqual(EMPTY_POSITIONS)
    expect(onExit.mock.calls[0][0][0]).toMatchObject({ reason: 'stopLoss', symbol: 'ETHUSDT' })
  })

  it('当前图表品种用 K 线最新价判定（tick 级优先于轮询价）', () => {
    const { recordClose } = setup({
      positionsBySymbol: { BTCUSDT: { long: longPos(), short: null } },
      live: { symbol: 'BTCUSDT', price: 89 },
      prices: { BTCUSDT: 105 },
    })
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(recordClose.mock.calls[0][0]).toMatchObject({ symbol: 'BTCUSDT', price: 89, pnl: -11 })
  })

  it('空头命中按卖出方向记流水；价在区间内不动', () => {
    const { recordClose } = setup({
      positionsBySymbol: { SOLUSDT: { long: null, short: shortPos() } },
      prices: { SOLUSDT: 130 },
    })
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(recordClose.mock.calls[0][0]).toMatchObject({ symbol: 'SOLUSDT', side: 'sell', pnl: -30 })

    const idle = setup({
      positionsBySymbol: { SOLUSDT: { long: null, short: shortPos() } },
      prices: { SOLUSDT: 105 },
    })
    expect(idle.recordClose).not.toHaveBeenCalled()
  })

  it('结算过的持仓对象登记进 autoSettled，供显式平仓簿记去重', () => {
    const held = longPos()
    const { autoSettled } = setup({
      positionsBySymbol: { ETHUSDT: { long: held, short: null } },
      prices: { ETHUSDT: 88 },
    })
    expect(autoSettled.has(held)).toBe(true)
  })

  it('同一命中只结算一次：价源对象换引用重跑 effect 也不重复记账', () => {
    const positionsBySymbol: PositionsBySymbol = { ETHUSDT: { long: longPos(), short: null } }
    const recordClose = vi.fn()
    const setPositionsBySymbol = vi.fn()
    const autoSettled = new WeakSet<Position>()
    const { rerender } = renderHook(() =>
      usePositionSettlement({
        positionsBySymbol,
        live: null,
        prices: { ETHUSDT: 88 },
        takerFeeRate: 0.001,
        recordClose,
        setPositionsBySymbol,
        autoSettled,
      }),
    )
    expect(recordClose).toHaveBeenCalledTimes(1)
    rerender()
    rerender()
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(setPositionsBySymbol).toHaveBeenCalledTimes(1)
  })

  it('无任何价源（如 ?perf 压测的非当前品种）时完全静默', () => {
    const { recordClose, onExit } = setup({
      positionsBySymbol: { ETHUSDT: { long: longPos(), short: null } },
      prices: {},
    })
    expect(recordClose).not.toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()
  })
})

describe('usePositionSettlement 移动止损', () => {
  /** 让 setPositionsBySymbol 真正落到外部变量上，以便逐帧 rerender */
  function loop(initial: PositionsBySymbol, initialPrices: Record<string, number>) {
    const recordClose = vi.fn()
    const autoSettled = new WeakSet<Position>()
    let positions = initial
    let prices = initialPrices
    const setPositionsBySymbol = vi.fn((fn: (prev: PositionsBySymbol) => PositionsBySymbol) => {
      positions = fn(positions)
    })
    const utils = renderHook(() =>
      usePositionSettlement({
        get positionsBySymbol() {
          return positions
        },
        live: null,
        get prices() {
          return prices
        },
        takerFeeRate: 0.001,
        recordClose,
        setPositionsBySymbol,
        autoSettled,
      }),
    )
    const setPrice = (symbol: string, price: number) => {
      prices = { [symbol]: price }
    }
    return { ...utils, recordClose, setPositionsBySymbol, autoSettled, positions: () => positions, setPrice }
  }

  it('多头现价上行只推进止损线，不结算；再跑一轮不重复写回', () => {
    const held = longPos({ takeProfit: 200, trailPct: 2 })
    const h = loop({ BTCUSDT: { long: held, short: null } }, { BTCUSDT: 150 })
    expect(h.recordClose).not.toHaveBeenCalled()
    expect(h.positions().BTCUSDT.long?.stopLoss).toBeCloseTo(147, 10)
    expect(h.positions().BTCUSDT.long?.trailPct).toBe(2)
    // 写回换了对象，但没平仓 → 原持仓不算已结算
    expect(h.autoSettled.has(held)).toBe(false)
    h.rerender()
    expect(h.setPositionsBySymbol).toHaveBeenCalledTimes(1)
  })

  it('写回后价格回落：按推进了的止损线结算一次', () => {
    const h = loop({ BTCUSDT: { long: longPos({ takeProfit: 200, trailPct: 2 }), short: null } }, { BTCUSDT: 150 })
    h.setPrice('BTCUSDT', 146)
    h.rerender()
    expect(h.recordClose).toHaveBeenCalledTimes(1)
    expect(h.recordClose.mock.calls[0][0]).toMatchObject({ symbol: 'BTCUSDT', side: 'buy', price: 146, pnl: 46 })
    expect(h.positions().BTCUSDT).toEqual(EMPTY_POSITIONS)

    h.setPrice('BTCUSDT', 120)
    h.rerender()
    expect(h.recordClose).toHaveBeenCalledTimes(1)
  })

  it('止损线只朝有利方向推进：价格回落不下移，回落到该线即结算', () => {
    const held = longPos({ takeProfit: 400, stopLoss: 90, trailPct: 10 })
    const h = loop({ BTCUSDT: { long: held, short: null } }, { BTCUSDT: 200 })
    expect(h.positions().BTCUSDT.long?.stopLoss).toBe(180)

    // 回落到 190：候选 171 低于已推进的 180 → 不下移、也不结算
    h.setPrice('BTCUSDT', 190)
    h.rerender()
    expect(h.setPositionsBySymbol).toHaveBeenCalledTimes(1)
    expect(h.recordClose).not.toHaveBeenCalled()
    expect(h.positions().BTCUSDT.long?.stopLoss).toBe(180)

    // 跌破 180 → 按该线结算一次
    h.setPrice('BTCUSDT', 175)
    h.rerender()
    expect(h.recordClose).toHaveBeenCalledTimes(1)
    expect(h.recordClose.mock.calls[0][0]).toMatchObject({ price: 175, pnl: 75 })
    expect(h.positions().BTCUSDT).toEqual(EMPTY_POSITIONS)
  })

  it('空头镜像推进；同一轮已命中的槽位不再写回', () => {
    const shortHeld = shortPos({ takeProfit: 40, stopLoss: 110, trailPct: 5 })
    const h = loop({ ETHUSDT: { long: null, short: shortHeld } }, { ETHUSDT: 60 })
    expect(h.recordClose).not.toHaveBeenCalled()
    expect(h.positions().ETHUSDT.short?.stopLoss).toBeCloseTo(63, 10)

    // 止盈命中那一帧：即使 trail 也算得出新止损，也不再写回（槽位即将清空）
    const tpHeld = longPos({ takeProfit: 150, stopLoss: 90, trailPct: 2 })
    const hit = loop({ BTCUSDT: { long: tpHeld, short: null } }, { BTCUSDT: 160 })
    expect(hit.recordClose).toHaveBeenCalledTimes(1)
    expect(hit.recordClose.mock.calls[0][0]).toMatchObject({ price: 160, pnl: 60 })
    expect(hit.setPositionsBySymbol).toHaveBeenCalledTimes(1)
    expect(hit.positions().BTCUSDT).toEqual(EMPTY_POSITIONS)
  })
})
