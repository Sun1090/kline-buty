// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import type { Candle } from '../../chart/types'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'

function makeCandles(n: number): Candle[] {
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

vi.mock('../../chart/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../chart/adapter')>()
  return {
    ...actual,
    LightweightChartAdapter: class {
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
    },
  }
})

import { ChartView } from '../ChartView'

afterEach(cleanup)

const base = {
  symbol: 'BTCUSDT',
  period: '1h' as const,
  chartType: 'candlestick' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  indicatorParams: DEFAULT_INDICATOR_PARAMS,
  replay: null,
  hasMore: false,
  onLoadMore: vi.fn(),
  status: 'live' as const,
}

describe('ChartView 渲染路径（O7）', () => {
  it('loading 态：显示骨架屏与加载文案', () => {
    render(<ChartView {...base} candles={[]} status="loading" />)
    expect(screen.getByText('加载历史数据…')).toBeDefined()
  })

  it('error 态：显示错误 + 重试按钮', () => {
    render(<ChartView {...base} candles={[]} status="error" onRetry={vi.fn()} />)
    expect(screen.getByText(/行情数据加载失败/)).toBeDefined()
    expect(screen.getByTestId('chart-retry')).toBeDefined()
    fireEvent.click(screen.getByTestId('chart-retry'))
  })

  it('error 态：演示数据降级按钮（N15）', () => {
    const onLoadDemo = vi.fn()
    render(<ChartView {...base} candles={[]} status="error" onLoadDemo={onLoadDemo} />)
    fireEvent.click(screen.getByTestId('chart-load-demo'))
    expect(onLoadDemo).toHaveBeenCalledTimes(1)
  })

  it('正常渲染：数据装载不抛错，截图/分辨率按钮存在（N5）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} />)
    expect(screen.getByTestId('screenshot-scale-toggle')).toBeDefined()
    expect(screen.getByText(/\d+x$/)).toBeDefined()
  })

  it('丢帧率 >10% 时显示角标（N14）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} frameStats={{ rate: 0.4, dropped: 4, total: 10 }} />)
    expect(screen.getByTestId('frame-drop-badge')).toBeDefined()
    expect(screen.getByText(/40%/)).toBeDefined()
  })

  it('丢帧率低时不显示角标（N14）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} frameStats={{ rate: 0.02, dropped: 1, total: 50 }} />)
    expect(screen.queryByTestId('frame-drop-badge')).toBeNull()
  })

  it('回放态进入：不抛出（replay 数据切片路径）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} replay={{ cursor: 50 }} />)
    expect(screen.queryByTestId('chart-retry')).toBeNull()
  })
})