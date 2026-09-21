// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

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
      setPositionDragHandler() {}
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
})
