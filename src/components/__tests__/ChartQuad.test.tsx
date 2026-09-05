// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup, render, screen } from '@testing-library/react'
import { useChartSync } from '../../hooks/useChartSync'

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

// O7：ChartQuad 组件渲染测试——mock 数据 hook 与 adapter（jsdom 无 canvas）
vi.mock('../../hooks/useKlineData', () => ({
  useKlineData: vi.fn(() => ({
    state: { candles: makeCandles(400), status: 'live' as const, live: null },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
    loadDemo: vi.fn(),
    frameStats: null,
  })),
}))

vi.mock('../../chart/adapter', () => {
  class MockAdapter {
    setCandles = vi.fn()
    updateCandle = vi.fn()
    setChartType = vi.fn()
    setMainIndicator = vi.fn()
    setSubIndicator = vi.fn()
    setSubScaleRange = vi.fn()
    setPositionLines = vi.fn()
    setReferencePrice = vi.fn()
    setMarkerPrice = vi.fn()
    setPositionDragHandler = vi.fn()
    setDrawings = vi.fn()
    setCoordBadge = vi.fn()
    setGlobalDrawingOpacity = vi.fn()
    setFontScale = vi.fn()
    setDrawingTool = vi.fn()
    setDrawingCallbacks = vi.fn()
    setSelectedDrawing = vi.fn()
    setNotesHidden = vi.fn()
    setSnapMode = vi.fn()
    setTheme = vi.fn()
    setLocale = vi.fn()
    setWatermark = vi.fn()
    setPeriodSeconds = vi.fn()
    setPriceScaleMode = vi.fn()
    setTimezoneMode = vi.fn()
    fitContent = vi.fn()
    scrollToRealTime = vi.fn()
    nudgeCrosshair = vi.fn()
    keyboardPlaceAnchor = vi.fn()
    keyboardPlaceAnchorAtCrosshair = vi.fn()
    takeScreenshot = vi.fn(() => null)
    startRegionSelect = vi.fn()
    cancelRegionSelect = vi.fn()
    onRegionCapture = vi.fn()
    subscribeCrosshairMove() {
      return () => {}
    }
    subscribeVisibleRange() {
      return () => {}
    }
    destroy() {}
  }
  return { LightweightChartAdapter: MockAdapter }
})

import { ChartQuad } from '../../components/ChartQuad'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'

const quadProps = {
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
  period: '1h' as const,
  chartType: 'candlestick' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  indicatorParams: DEFAULT_INDICATOR_PARAMS,
}

beforeEach(() => {})

afterEach(cleanup)

describe('useChartSync', () => {
  it('A 上报 → 广播给其他图（source 自身不收到）', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    expect(result.current.ranges[0]).toBeNull()
    expect(result.current.ranges[1]).toEqual({ from: 10, to: 50 })
    expect(result.current.ranges[2]).toEqual({ from: 10, to: 50 })
    expect(result.current.ranges[3]).toEqual({ from: 10, to: 50 })
  })

  it('回显（同值回调）不再广播', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    const before = JSON.stringify(result.current.ranges)
    act(() => {
      result.current.broadcast(1, { from: 10, to: 50 })
    })
    expect(JSON.stringify(result.current.ranges)).toBe(before)
  })

  it('B 独立拖动新值 → 正常广播', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    act(() => {
      result.current.broadcast(1, { from: 20, to: 80 })
    })
    expect(result.current.ranges[0]).toEqual({ from: 20, to: 80 })
    expect(result.current.ranges[2]).toEqual({ from: 20, to: 80 })
  })

  it('两图时只有对方收到', () => {
    const { result } = renderHook(() => useChartSync(2))
    act(() => {
      result.current.broadcast(1, { from: 5, to: 9 })
    })
    expect(result.current.ranges[0]).toEqual({ from: 5, to: 9 })
    expect(result.current.ranges[1]).toBeNull()
  })
})

describe('ChartQuad 组件渲染（O7）', () => {
  it('渲染 2×2 四格，每格周期选择器存在', () => {
    render(<ChartQuad {...quadProps} />)
    expect(screen.getAllByTestId(/quad-period-/).length).toBe(4)
    expect(screen.getByLabelText('period: BTCUSDT')).toBeDefined()
  })

  it('onCellPeriod 回调：改某格周期触发（四格独立）', () => {
    const onCellPeriod = vi.fn()
    render(<ChartQuad {...quadProps} onCellPeriod={onCellPeriod} />)
    const select = screen.getByLabelText('period: ETHUSDT') as HTMLSelectElement
    act(() => {
      select.value = '5m'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onCellPeriod).toHaveBeenCalled()
  })

  it('periods 数组短于 symbols 时，其余格回退到全局 period', () => {
    render(
      <ChartQuad
        {...quadProps}
        periods={['1m']} // 仅第 1 格指定，其余回退 '1h'
      />,
    )
    expect((screen.getByLabelText('period: BTCUSDT') as HTMLSelectElement).value).toBe('1m')
    expect((screen.getByLabelText('period: ETHUSDT') as HTMLSelectElement).value).toBe('1h')
    expect((screen.getByLabelText('period: SOLUSDT') as HTMLSelectElement).value).toBe('1h')
  })
})
