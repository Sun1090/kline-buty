// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'

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

vi.mock('../../hooks/useKlineData', () => ({
  useKlineData: vi.fn(() => ({
    state: { candles: makeCandles(800), status: 'live' as const },
    hasMore: true,
    loadMore: vi.fn(),
  })),
}))

type MockAdapterInstance = {
  onRange: ((from: number, to: number) => void) | null
  setVisibleRange: ReturnType<typeof vi.fn>
}

const instances: MockAdapterInstance[] = []

vi.mock('../../chart/adapter', () => {
  class MockAdapter {
    onRange: ((from: number, to: number) => void) | null = null
    setVisibleRange = vi.fn()
    setCandles = vi.fn()
    updateCandle = vi.fn()
    setChartType = vi.fn()
    setMainIndicator = vi.fn()
    setSubIndicator = vi.fn()
    setPositionLines = vi.fn()
    setReferencePrice = vi.fn()
    setPositionDragHandler = vi.fn()
    setDrawings = vi.fn()
    setDrawingTool = vi.fn()
    setDrawingCallbacks = vi.fn()
    setTheme = vi.fn()
    setLocale = vi.fn()
    fitContent = vi.fn()
    scrollToRealTime = vi.fn()
    constructor() {
      instances.push(this)
    }
    subscribeCrosshairMove() {
      return () => {}
    }
    subscribeVisibleRange(cb: (from: number, to: number) => void) {
      this.onRange = cb
      return () => {}
    }
    destroy() {}
  }
  return { LightweightChartAdapter: MockAdapter }
})

import { ChartPair } from '../ChartPair'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'

const props = {
  symbol: 'BTCUSDT',
  secondSymbol: 'ETHUSDT',
  period: '1h' as const,
  chartType: 'candlestick' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  indicatorParams: DEFAULT_INDICATOR_PARAMS,
}

beforeEach(() => {
  instances.length = 0
})

afterEach(cleanup)

describe('ChartPair 时间轴联动', () => {
  it('A 拖动 → B 跟随（setVisibleRange）', () => {
    render(<ChartPair {...props} />)
    const [a, b] = instances
    expect(a).toBeDefined()
    expect(b).toBeDefined()

    act(() => a.onRange!(10, 50))
    expect(b.setVisibleRange).toHaveBeenCalledWith({ from: 10, to: 50 })
  })

  it('防回环：B 回显同区间 → A 不重复写入', () => {
    render(<ChartPair {...props} />)
    const [a, b] = instances

    act(() => a.onRange!(10, 50))
    const callsAfterA = a.setVisibleRange.mock.calls.length
    act(() => b.onRange!(10, 50))
    expect(a.setVisibleRange.mock.calls.length).toBe(callsAfterA)
  })

  it('B 独立拖动 → A 跟随', () => {
    render(<ChartPair {...props} />)
    const [a, b] = instances
    act(() => b.onRange!(20, 80))
    expect(a.setVisibleRange).toHaveBeenCalledWith({ from: 20, to: 80 })
  })
})
