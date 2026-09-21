// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'

/** 合成 K 线：当前图表品种（BTCUSDT）最新价约 100，用于验证守护不接管当前品种 */
function makeCandles(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    time: 1786797540 + i * 60,
    open: 100,
    high: 101,
    low: 99,
    close: 100 + Math.sin(i / 10),
    volume: 10,
    isClosed: true,
  }))
}

vi.mock('../hooks/useKlineData', () => ({
  useKlineData: vi.fn(() => ({
    state: { candles: makeCandles(800), status: 'live' as const, live: null },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
    loadDemo: vi.fn(),
    frameStats: null,
  })),
}))

const priceHolder = vi.hoisted(() => ({ current: {} as Record<string, number> }))
vi.mock('../hooks/useSymbolPrices', () => ({
  useSymbolPrices: () => priceHolder.current,
}))

/** 图表适配器注册的价位线拖拽回调（用于直接从测试里模拟「用户拖线」） */
type DragCb = ((key: 'entry' | 'takeProfit' | 'stopLoss', price: number) => number | null | void) | null
const dragHolder = vi.hoisted(() => ({ cb: null as DragCb }))

vi.mock('../utils/versionCheck', () => ({
  checkVersionUpdate: vi.fn(() => ({ hasUpdate: false, version: '' })),
  readMetaVersion: vi.fn(() => '0.0.0'),
}))

vi.mock('../chart/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../chart/adapter')>()
  return {
    ...actual,
    LightweightChartAdapter: class {
      setCandles() {}
      updateCandle() {}
      setChartType() {}
      setMainIndicator() {}
      setSubIndicator() {}
      setSubScaleRange() {}
      setPositionLines() {}
      setReferencePrice() {}
      setMarkerPrice() {}
      setSessionHighLow() {}
      setTradeMarkers() {}
      setPositionDragHandler(cb: DragCb) {
        dragHolder.cb = cb
      }
      setDrawings() {}
      setCoordBadge() {}
      setGlobalDrawingOpacity() {}
      setFontScale() {}
      setDrawingTool() {}
      setDrawingCallbacks() {}
      onRegionCapture() {}
      setTheme() {}
      setLocale() {}
      setPeriodSeconds() {}
      setWatermark() {}
      setPriceScaleMode() {}
      setTimezoneMode() {}
      setSnapMode() {}
      fitContent() {}
      scrollToRealTime() {}
      subscribeCrosshairMove() {
        return () => {}
      }
      subscribeVisibleRange() {
        return () => {}
      }
      destroy() {}
    },
  }
})

import { App } from '../App'

const POSITIONS_KEY = 'kline-buty:positionsBySymbol'
const TRADES_KEY = 'kline-buty:paperTrades'

/** 其他品种（ETHUSDT）持有多头：止盈 120 / 止损 90 */
function seedEthLong() {
  localStorage.setItem(
    POSITIONS_KEY,
    JSON.stringify({ ETHUSDT: { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 120, stopLoss: 90 }, short: null } }),
  )
}

interface CloseRecord {
  symbol: string
  kind: string
  side: string
  price: number
  pnl: number
}

const storedTrades = () => JSON.parse(localStorage.getItem(TRADES_KEY) ?? '[]') as CloseRecord[]
const storedLong = () =>
  (JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') as { ETHUSDT?: { long: unknown } }).ETHUSDT?.long

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  priceHolder.current = {}
})

describe('App 跨品种止盈止损守护', () => {
  it('切走图表后其他品种触止损：按轮询最新价结算、写流水并清空槽位', async () => {
    seedEthLong()
    priceHolder.current = { ETHUSDT: 88 }
    render(<App />)
    await waitFor(() => expect(storedLong()).toBeNull())
    const trades = storedTrades()
    expect(trades).toHaveLength(1)
    // 流水里的 pnl 是净额：价差 −12 再扣平仓手续费 0.1
    expect(trades[0]).toMatchObject({ symbol: 'ETHUSDT', kind: 'close', side: 'buy', price: 88, pnl: -12.1 })
    // 横幅提示命中原因（当前语言 zh-CN）
    expect(await screen.findByTestId('order-toast').catch(() => null)).not.toBeNull()
  })

  it('价格仍在止盈止损区间内：不动仓、不记流水', async () => {
    seedEthLong()
    priceHolder.current = { ETHUSDT: 105 }
    render(<App />)
    // 让 effect 与轮询有机会跑一轮后再断言
    await waitFor(() => expect(storedLong()).not.toBeNull())
    await new Promise((r) => setTimeout(r, 50))
    expect(storedTrades()).toHaveLength(0)
    expect(storedLong()).toMatchObject({ entry: 100 })
  })

  it('移动止损：先把止损推进并持久化，价格回落到该线才结算一次', async () => {
    localStorage.setItem(
      POSITIONS_KEY,
      JSON.stringify({
        ETHUSDT: { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 400, stopLoss: 90, trailPct: 10 }, short: null },
      }),
    )
    priceHolder.current = { ETHUSDT: 200 }
    const { rerender } = render(<App />)
    // 200 × (1−10%) = 180：只推进止损，浮盈仍远未触线
    await waitFor(() => expect(storedLong()).toMatchObject({ stopLoss: 180, trailPct: 10 }))
    expect(storedTrades()).toHaveLength(0)

    priceHolder.current = { ETHUSDT: 175 }
    rerender(<App />)
    await waitFor(() => expect(storedLong()).toBeNull())
    expect(storedTrades()).toHaveLength(1)
    // 净额：价差 +75 扣平仓手续费 0.1
    expect(storedTrades()[0]).toMatchObject({ symbol: 'ETHUSDT', kind: 'close', side: 'buy', price: 175, pnl: 74.9 })

    // 槽位已空：再来一帧也不会重复记账
    priceHolder.current = { ETHUSDT: 160 }
    rerender(<App />)
    await new Promise((r) => setTimeout(r, 50))
    expect(storedTrades()).toHaveLength(1)
  })

  it('未设移动止损的持仓不会被写回逻辑改动', async () => {
    seedEthLong()
    priceHolder.current = { ETHUSDT: 110 }
    render(<App />)
    await new Promise((r) => setTimeout(r, 50))
    expect(storedLong()).toMatchObject({ entry: 100, stopLoss: 90, takeProfit: 120 })
    expect('trailPct' in (storedLong() as object)).toBe(false)
    expect(storedTrades()).toHaveLength(0)
  })
})

describe('App 图上拖拽价位线', () => {
  const seedBtcLong = () =>
    localStorage.setItem(
      POSITIONS_KEY,
      JSON.stringify({ BTCUSDT: { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 120, stopLoss: 90 }, short: null } }),
    )
  const storedBtcLong = () =>
    (JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') as { BTCUSDT?: { long: Record<string, number> | null } }).BTCUSDT?.long
  /** 取适配器最近一次注册的回调（每次渲染都会重挂，闭包里是当前持仓） */
  const dragTo = (key: 'entry' | 'takeProfit' | 'stopLoss', price: number) => {
    let out: number | null | void = undefined
    act(() => {
      out = dragHolder.cb?.(key, price)
    })
    return out
  }
  /** 本文件 mock 的合成 K 线最新收盘价（= 当前品种结算用价） */
  const lastClose = makeCandles(800)[799].close

  it('合法价写回持仓；越界价被拒绝且返回 null（线停在原位）', async () => {
    seedBtcLong()
    render(<App />)
    await waitFor(() => expect(dragHolder.cb).not.toBeNull())
    expect(lastClose).toBeGreaterThan(90)

    expect(dragTo('takeProfit', 130)).toBe(130)
    expect(storedBtcLong()).toMatchObject({ takeProfit: 130, stopLoss: 90 })

    // 止盈拖到开仓价之下 → 拒绝，存值不变
    expect(dragTo('takeProfit', 95)).toBeNull()
    expect(storedBtcLong()).toMatchObject({ takeProfit: 130 })
    // 止损拖到现价与开仓价的较有利者之上 → 拒绝
    expect(dragTo('stopLoss', 150)).toBeNull()
    expect(storedBtcLong()).toMatchObject({ stopLoss: 90 })
    // 与止盈交叉 → 拒绝
    expect(dragTo('stopLoss', 130)).toBeNull()
    expect(storedBtcLong()).toMatchObject({ stopLoss: 90 })
    expect(storedTrades()).toHaveLength(0)
  })

  it('拖到现价之上的保本位：写回即触价结算一次', async () => {
    seedBtcLong()
    render(<App />)
    await waitFor(() => expect(dragHolder.cb).not.toBeNull())
    // 100 仍在允许上界内（≤ 开仓价），但已高于最新价 → 保存即触发止损结算
    expect(dragTo('stopLoss', 100)).toBe(100)
    await waitFor(() => expect(storedBtcLong()).toBeNull())
    const trades = storedTrades()
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
  })

  it('开仓价仍可拖动，不参与止盈止损校验', async () => {
    seedBtcLong()
    render(<App />)
    await waitFor(() => expect(dragHolder.cb).not.toBeNull())
    expect(dragTo('entry', 105)).toBe(105)
    expect(storedBtcLong()).toMatchObject({ entry: 105, takeProfit: 120, stopLoss: 90 })
  })

  it('双向持仓：拖动的是图表当前展示的那一侧（short 存在时优先 long 槽）', async () => {
    localStorage.setItem(
      POSITIONS_KEY,
      JSON.stringify({
        BTCUSDT: {
          long: null,
          short: { entry: 100, quantity: 1, direction: 'short', takeProfit: 80, stopLoss: 110 },
        },
      }),
    )
    render(<App />)
    await waitFor(() => expect(dragHolder.cb).not.toBeNull())
    // 空头：止盈拖到开仓价之上 → 拒绝；拖到现价之下且低于开仓价 → 接受
    expect(dragTo('takeProfit', 105)).toBeNull()
    expect(dragTo('takeProfit', 95)).toBe(95)
    expect(
      (JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') as { BTCUSDT: { short: Record<string, number> } }).BTCUSDT.short,
    ).toMatchObject({ takeProfit: 95, stopLoss: 110 })
  })
})
