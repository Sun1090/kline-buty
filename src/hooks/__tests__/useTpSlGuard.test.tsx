// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useTpSlGuard } from '../useTpSlGuard'
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

function setup(over: Partial<Parameters<typeof useTpSlGuard>[0]> = {}) {
  const recordClose = vi.fn()
  const setPositionsBySymbol = vi.fn()
  const onExit = vi.fn()
  const base: Parameters<typeof useTpSlGuard>[0] = {
    positionsBySymbol: {},
    currentSymbol: 'BTCUSDT',
    prices: {},
    takerFeeRate: 0.001,
    recordClose,
    setPositionsBySymbol,
    onExit,
  }
  const utils = renderHook(() => useTpSlGuard({ ...base, ...over }))
  return { ...utils, recordClose, setPositionsBySymbol, onExit }
}

afterEach(cleanup)

describe('useTpSlGuard 跨品种止盈止损守护', () => {
  it('其他品种触止损：按反向平仓并结算盈亏、清空该槽位', () => {
    const { recordClose, setPositionsBySymbol, onExit } = setup({
      positionsBySymbol: { ETHUSDT: { long: longPos(), short: null } },
      prices: { ETHUSDT: 88 },
    })
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(recordClose).toHaveBeenCalledWith({
      symbol: 'ETHUSDT',
      // 平仓流水的 side 记被平掉的方向（与 App 既有结算路径一致）
      side: 'buy',
      price: 88,
      qty: 1,
      // 开仓名义额 100 × 0.1% = 0.1
      fee: 0.1,
      feeRate: 0.001,
      pnl: -12,
    })
    expect(setPositionsBySymbol).toHaveBeenCalledTimes(1)
    const next = (setPositionsBySymbol.mock.calls[0][0] as (prev: PositionsBySymbol) => PositionsBySymbol)({
      ETHUSDT: { long: longPos(), short: null },
    })
    expect(next.ETHUSDT).toEqual(EMPTY_POSITIONS)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit.mock.calls[0][0][0]).toMatchObject({ reason: 'stopLoss', symbol: 'ETHUSDT' })
  })

  it('当前图表品种交给 K 线级结算，守护不重复处理', () => {
    const { recordClose } = setup({
      positionsBySymbol: { BTCUSDT: { long: longPos(), short: null } },
      currentSymbol: 'BTCUSDT',
      prices: { BTCUSDT: 88 },
    })
    expect(recordClose).not.toHaveBeenCalled()
  })

  it('空头命中按买入方向平仓；未达阈值不动', () => {
    const short: Position = { entry: 100, quantity: 1, direction: 'short', takeProfit: 80, stopLoss: 110 }
    const { recordClose } = setup({
      positionsBySymbol: { SOLUSDT: { long: null, short } },
      prices: { SOLUSDT: 130 },
    })
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(recordClose.mock.calls[0][0]).toMatchObject({ symbol: 'SOLUSDT', side: 'sell', pnl: -30 })

    const second = setup({
      positionsBySymbol: { SOLUSDT: { long: null, short } },
      prices: { SOLUSDT: 105 },
    })
    expect(second.recordClose).not.toHaveBeenCalled()
  })

  it('同一命中只结算一次：价源对象换引用重跑 effect 也不重复记账', () => {
    const positionsBySymbol: PositionsBySymbol = { ETHUSDT: { long: longPos(), short: null } }
    const recordClose = vi.fn()
    const setPositionsBySymbol = vi.fn()
    // 每次渲染都构造新的 prices 对象（内容相同）→ deps 变化会重跑 effect
    const { rerender } = renderHook(() =>
      useTpSlGuard({
        positionsBySymbol,
        currentSymbol: 'BTCUSDT',
        prices: { ETHUSDT: 88 },
        takerFeeRate: 0.001,
        recordClose,
        setPositionsBySymbol,
      }),
    )
    expect(recordClose).toHaveBeenCalledTimes(1)
    rerender()
    rerender()
    expect(recordClose).toHaveBeenCalledTimes(1)
    expect(setPositionsBySymbol).toHaveBeenCalledTimes(1)
  })

  it('价源为空（如 ?perf 压测不联网）时完全静默', () => {
    const { recordClose, onExit } = setup({
      positionsBySymbol: { ETHUSDT: { long: longPos(), short: null } },
      prices: {},
    })
    expect(recordClose).not.toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()
  })
})
