// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
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

// 装载后图表是否还「补发一次当前可见区间」由这里控制：mock 的 subscribeVisibleRange 从不触发回调，
// 正好复现「整窗 setData 之后不再有变化事件」的真实形态（lightweight-charts 只在区间真的变了才发）
const harness = vi.hoisted(() => ({
  range: null as { from: number; to: number } | null,
  /** 图表侧的可见区间变化入口（ChartView 挂载时注册进来，测试用它模拟一次拖动落地） */
  fire: null as ((from: number, to: number, trusted?: boolean) => void) | null,
  /** 本图被要求写入的可视区间（ setVisibleRange 的调用记录 ） */
  views: [] as { from: number; to: number }[],
}))

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
      setSessionHighLow = vi.fn()
      setTradeMarkers = vi.fn()
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
      priceAt = vi.fn(() => ({ time: 1786797540, price: 50766.61229625584 }))
      startRegionSelect = vi.fn()
      cancelRegionSelect = vi.fn()
      onRegionCapture = vi.fn()
      subscribeCrosshairMove() {
        return () => {}
      }
      setVisibleRange = vi.fn((r: { from: number; to: number }) => {
        harness.views.push(r)
      })
      subscribeVisibleRange(cb: (from: number, to: number, trusted?: boolean) => void) {
        harness.fire = cb
        return () => {}
      }
      visibleRange() {
        return harness.range
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

  it('整窗装载后不再有可见区间变化事件时，A11 可视范围仍必须出现', () => {
    // 回归：装载期间作废的那次通知，此后 lightweight-charts 不会再补发（区间没「变」）。
    // 数据量低于裁剪阈值（200 根，即日常量级）时之后再没有别的事件，A11 条就永远不渲染
    harness.range = { from: 0, to: 199 }
    try {
      render(<ChartView {...base} candles={makeCandles(200)} />)
      const strip = screen.getByTestId('chart-visible-range')
      expect(strip.textContent).toContain('—')
    } finally {
      harness.range = null
    }
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

  it('VOL 副图的均量线走成交量缩写：图例不出现 11 位原始数字', () => {
    const heavy = Array.from({ length: 60 }, (_, i) => ({
      time: 1786797540 + i * 60,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 12_750_000_000,
      isClosed: true,
    }))
    render(<ChartView {...base} candles={heavy} />)
    const badge = screen.getByTestId('chart-indicator-last')
    expect(badge.textContent).toContain('VOL-MA: 12750.00M')
    expect(badge.textContent).not.toContain('12750000000')
  })

  it('O7：RSI 副图时显示指标末尾值一览 + 副图 Y 轴固定切换按钮（H12）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} subIndicator="rsi" />)
    // 指标末尾值一览（chart-indicator-last）在数据存在时显示
    const badge = screen.queryByTestId('chart-indicator-last')
    if (badge) {
      expect(badge).toBeDefined()
    }
    // RSI 为有界指标 → sub-scale-toggle 出现
    const toggle = screen.queryByTestId('sub-scale-toggle')
    if (toggle) {
      expect(toggle.getAttribute('aria-pressed')).toBe('false')
    }
  })
})

// 右键菜单的三个出口（复制 / 提醒 / 挂单）共用同一份 ctxMenu.price：
// 光标价是像素反算的浮点值，收口不到位就会把 50766.61229625584 送进下单面板
describe('ChartView 右键菜单价位口径', () => {
  function openMenu() {
    const { container } = render(<ChartView {...base} candles={makeCandles(200)} />)
    fireEvent.contextMenu(container.firstElementChild as HTMLElement, { clientX: 120, clientY: 200 })
  }

  it('「买入限价」交出的挂单价已收口到展示精度', () => {
    openMenu()
    const seen: { price: number }[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent<{ price: number }>).detail)
    window.addEventListener('chart-request-limit-order', listener)
    fireEvent.click(screen.getByTestId('ctx-limit-buy'))
    window.removeEventListener('chart-request-limit-order', listener)
    // 未收口时这里会是 50766.61229625584
    expect(seen).toHaveLength(1)
    expect(seen[0].price).toBe(50766.61)
  })

  it('「添加提醒」交出的触发价同样收口', () => {
    openMenu()
    const seen: { price: number }[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent<{ price: number }>).detail)
    window.addEventListener('chart-request-alert', listener)
    fireEvent.click(screen.getByTestId('ctx-add-alert'))
    window.removeEventListener('chart-request-alert', listener)
    expect(seen).toHaveLength(1)
    expect(seen[0].price).toBe(50766.61)
  })

  it('「复制价格」写入剪贴板的是收口后的字符串', () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    openMenu()
    fireEvent.click(screen.getByTestId('ctx-copy-price'))
    expect(writeText).toHaveBeenCalledWith('50766.61')
  })
})

describe('多图视角同步的单位（issue #186）', () => {
  afterEach(() => {
    harness.views.length = 0
    harness.fire = null
  })

  it('本格视角落地时上报的是秒，不是逻辑索引', () => {
    const candles = makeCandles(800)
    const onViewRangeChange = vi.fn()
    render(<ChartView {...base} period="1m" candles={candles} onViewRangeChange={onViewRangeChange} />)
    expect(harness.fire, 'ChartView 应订阅可见区间变化').not.toBeNull()
    act(() => harness.fire!(10, 50, true))
    expect(onViewRangeChange).toHaveBeenCalledWith({ from: candles[10].time, to: candles[50].time })
  })

  it('外部指令给的是秒：按本格自己的周期换算成索引再落位', () => {
    const oneMin = makeCandles(800)
    const range = { from: oneMin[10].time, to: oneMin[50].time }
    // 本格是 5m 数据：这一小时只能落在索引 2..10。旧实现把秒当索引硬套，视角直接飞出数据之外
    const fiveMin = Array.from({ length: 150 }, (_, i) => ({ ...oneMin[i * 5] }))
    const { rerender } = render(<ChartView {...base} period="5m" candles={fiveMin} />)
    rerender(<ChartView {...base} period="5m" candles={fiveMin} externalRange={range} />)
    expect(harness.views).toContainEqual({ from: 2, to: 10 })
  })

  it('窗口比本格周期还窄时撑开到至少两根，不落退化视角', () => {
    const oneMin = makeCandles(800)
    // 本格是 1h：50 分钟的窗口两端都吸附到同一根（索引 0），按索引硬算会落 {0,0}
    const oneHour = Array.from({ length: 13 }, (_, i) => ({ ...oneMin[i * 60] }))
    const { rerender } = render(<ChartView {...base} period="1h" candles={oneHour} />)
    rerender(<ChartView {...base} period="1h" candles={oneHour} externalRange={{ from: oneMin[0].time, to: oneMin[0].time + 50 * 60 }} />)
    expect(harness.views).toContainEqual({ from: 0, to: 1 })
  })
})